local QBCore = exports['qb-core']:GetCoreObject()

-- Compatibility Helpers for Banking and Inventory
local function RemoveBankMoney(Player, amount, reason)
    local src = Player.PlayerData.source
    
    -- Try qb-banking export first
    if GetResourceState('qb-banking') == 'started' then
        local success = exports['qb-banking']:RemoveMoney(src, amount, reason)
        if success then return true end
    end
    
    -- Try standard QBCore RemoveMoney
    if Player.Functions.RemoveMoney('bank', amount, reason) then
        return true
    end
    
    return false
end

local function RemoveCashMoney(Player, amount, reason)
    local src = Player.PlayerData.source
    
    -- Try qb-banking export first
    if GetResourceState('qb-banking') == 'started' then
        local success = exports['qb-banking']:RemoveMoney(src, amount, reason, 'cash')
        if success then return true end
    end
    
    -- Try standard QBCore RemoveMoney
    if Player.Functions.RemoveMoney('cash', amount, reason) then
        return true
    end
    
    return false
end

local function AddInventoryItem(Player, item, qty, info)
    local src = Player.PlayerData.source
    
    -- Try qb-inventory export first
    if GetResourceState('qb-inventory') == 'started' then
        local success = exports['qb-inventory']:AddItem(src, item, qty, false, info)
        if success then return true end
    end
    
    -- Try standard QBCore AddItem
    if Player.Functions.AddItem(item, qty, false, info) then
        return true
    end
    
    return false
end

-- ─── DATABASE SETUP ───────────────────────────────────────────────────────────
-- Creates the notes table if it doesn't already exist

CreateThread(function()
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS homecomputer_notes (
            citizenid VARCHAR(50) NOT NULL PRIMARY KEY,
            note      LONGTEXT    NOT NULL DEFAULT '',
            updated   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ]])

    MySQL.query([[
        CREATE TABLE IF NOT EXISTS homecomputer_channels (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            url VARCHAR(255) NOT NULL,
            logo VARCHAR(255) DEFAULT ''
        )
    ]])

    -- Populate default channels if empty
    CreateThread(function()
        Wait(1000) -- Wait for DB table creation to settle
        local count = MySQL.scalar.await('SELECT COUNT(*) FROM homecomputer_channels')
        if count == 0 then
            local defaults = {
                { name = "Weazel News Live", category = "News", url = "https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8", logo = "📰" },
                { name = "NASA Space TV", category = "Science", url = "https://ntv1.akamaized.net/hls/live/2014027/NASA-GUIDE-1/master.m3u8", logo = "🚀" },
                { name = "Los Santos Music Channel", category = "Music", url = "https://d2zihajmogu5jn.cloudfront.net/bipbop/bipbop.m3u8", logo = "🎵" },
                { name = "Maze Bank Sports", category = "Sports", url = "https://rbmn-live.akamaized.net/hls/live/590964/sports/master.m3u8", logo = "⚽" }
            }
            for _, ch in ipairs(defaults) do
                MySQL.query('INSERT INTO homecomputer_channels (name, category, url, logo) VALUES (?, ?, ?, ?)', {
                    ch.name, ch.category, ch.url, ch.logo
                })
            end
            print(('[%s] Loaded default TV channels into database.'):format(GetCurrentResourceName()))
        end
    end)
end)

-- ─── GET PLAYER DATA ──────────────────────────────────────────────────────────

QBCore.Functions.CreateCallback('homecomputer:server:getPlayerData', function(source, cb)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    local data = {
        name = "Citizen",
        job = "Unemployed",
        grade = "None",
        bank = 0,
        cash = 0,
        citizenid = "N/A",
        loanDebt = 0,
        creditBalance = 0
    }
    if Player then
        data.name = Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname
        data.job = Player.PlayerData.job.label
        data.grade = Player.PlayerData.job.grade.name
        data.bank = Player.PlayerData.money['bank']
        data.cash = Player.PlayerData.money['cash']
        data.citizenid = Player.PlayerData.citizenid
        data.loanDebt = Player.PlayerData.metadata["loans"] and Player.PlayerData.metadata["loans"].debt or 0
        data.creditBalance = Player.PlayerData.metadata["lombank"] and Player.PlayerData.metadata["lombank"].balance or 0
    end
    cb(data)
end)

-- ─── CRAFT EDIBLE CALLBACK ────────────────────────────────────────────────────

QBCore.Functions.CreateCallback('homecomputer:server:craftEdible', function(source, cb, data)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then cb({ success = false, error = "Player not loaded" }) return end

    local recipes = {
        stone_patch_pack = {
            { name = "wet_weed", qty = 2 },
            { name = "chemicals", qty = 1 },
            { name = "empty_weed_bag", qty = 5 }
        },
        jolly_rancher_pack = {
            { name = "wet_weed", qty = 2 },
            { name = "bakingsoda", qty = 1 },
            { name = "empty_weed_bag", qty = 5 }
        },
        stoney_thc_pack = {
            { name = "wet_weed", qty = 3 },
            { name = "chemicals", qty = 2 },
            { name = "empty_weed_bag", qty = 5 }
        },
        whis_bites_pack = {
            { name = "wet_weed", qty = 2 },
            { name = "bakingsoda", qty = 2 },
            { name = "empty_weed_bag", qty = 5 }
        }
    }

    local recipe = recipes[data.item]
    if not recipe then cb({ success = false, error = "Invalid recipe selection" }) return end

    -- Check ingredients
    for _, ingredient in ipairs(recipe) do
        local invItem = Player.Functions.GetItemByName(ingredient.name)
        if not invItem or invItem.amount < ingredient.qty then
            cb({ success = false, error = "Insufficient ingredients! Missing " .. (QBCore.Shared.Items[ingredient.name] and QBCore.Shared.Items[ingredient.name].label or ingredient.name) })
            return
        end
    end

    -- Consume ingredients
    for _, ingredient in ipairs(recipe) do
        Player.Functions.RemoveItem(ingredient.name, ingredient.qty)
        TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items[ingredient.name] or {name = ingredient.name, label = ingredient.name}, "remove")
    end

    -- Add crafted pack item usable in ms_edibles_system
    Player.Functions.AddItem(data.item, 1)
    TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items[data.item] or {name = data.item, label = data.item}, "add")
    
    cb({ success = true })
end)

-- ─── GET NOTE ─────────────────────────────────────────────────────────────────

RegisterNetEvent('homecomputer:server:getNote', function()
    local src    = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    local citizenid = Player.PlayerData.citizenid

    local result = MySQL.scalar.await(
        'SELECT note FROM homecomputer_notes WHERE citizenid = ?',
        { citizenid }
    )

    TriggerClientEvent('homecomputer:client:receiveNote', src, result or '')
end)

-- ─── SAVE NOTE ────────────────────────────────────────────────────────────────

RegisterNetEvent('homecomputer:server:saveNote', function(note)
    local src    = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    -- Basic sanity check – limit note size to 10 000 characters
    if type(note) ~= 'string' then return end
    if #note > 10000 then
        note = string.sub(note, 1, 10000)
    end

    local citizenid = Player.PlayerData.citizenid

    MySQL.query([[
        INSERT INTO homecomputer_notes (citizenid, note)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE note = VALUES(note)
    ]], { citizenid, note })
end)

-- ─── GLITCH STREAMING SIGNALLING & CALLBACKS ───────────────────────────────────

local activeStreams = {}

-- QBCore Callback to get the active streams list
QBCore.Functions.CreateCallback('homecomputer:server:getActiveStreams', function(source, cb)
    cb(activeStreams)
end)

RegisterNetEvent("utk_render:sendChatMessage", function(data)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    local name = Player and (Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname) or GetPlayerName(src)
    data.sender = name
    TriggerClientEvent("utk_render:receiveChatMessage", -1, data)
end)

RegisterNetEvent("utk_render:startStreaming", function(data)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    local name = Player and (Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname) or GetPlayerName(src)
    local streamId = tostring(data.streamId)
    
    activeStreams[streamId] = {
        streamId = streamId,
        title = data.title or "Live Stream",
        category = data.category or "Just Chatting",
        streamerName = name,
        source = src
    }
    TriggerClientEvent("utk_render:newStream", -1, activeStreams[streamId])
end)

RegisterNetEvent("utk_render:joinStream", function(data)
    TriggerClientEvent("utk_render:joinStream", -1, data)
end)

RegisterNetEvent("utk_render:sendRTCOffer", function(data)
    TriggerClientEvent("utk_render:sendRTCOffer", data.serverid, data)
end)

RegisterNetEvent("utk_render:sendRTCAnswer", function(data)
    TriggerClientEvent("utk_render:sendRTCAnswer", -1, data)
end)

RegisterNetEvent("utk_render:newIceCandidateStreamer", function(data)
    TriggerClientEvent("utk_render:newIceCandidateStreamer", data.serverid, data)
end)

RegisterNetEvent("utk_render:newIceCandidateWatcher", function(data)
    TriggerClientEvent("utk_render:newIceCandidateWatcher", -1, data)
end)

RegisterNetEvent("utk_render:leaveStream", function(data)
    TriggerClientEvent("utk_render:leaveStream", -1, data)
end)

RegisterNetEvent("utk_render:stopStream", function(data)
    local streamId = tostring(data.streamId)
    activeStreams[streamId] = nil
    TriggerClientEvent("utk_render:stopStream", -1, data)
end)

-- Clean up active streams if a player disconnects
AddEventHandler('playerDropped', function()
    local src = source
    for id, stream in pairs(activeStreams) do
        if stream.source == src then
            activeStreams[id] = nil
            TriggerClientEvent("utk_render:stopStream", -1, { streamId = id, serverid = src })
            break
        end
    end
end)


-- ─── LIVE TV CHANNELS ──────────────────────────────────────────────────────────

-- QBCore Callback to get channels list
QBCore.Functions.CreateCallback('homecomputer:server:getTvChannels', function(source, cb)
    MySQL.query('SELECT * FROM homecomputer_channels ORDER BY name ASC', {}, function(results)
        cb(results or {})
    end)
end)

-- Event to add a channel
RegisterNetEvent('homecomputer:server:addTvChannel', function(data)
    local src = source
    if not data or not data.name or not data.category or not data.url then return end
    
    local name = tostring(data.name)
    local category = tostring(data.category)
    local url = tostring(data.url)
    local logo = data.logo and tostring(data.logo) or '📺'
    
    MySQL.query('INSERT INTO homecomputer_channels (name, category, url, logo) VALUES (?, ?, ?, ?)', {
        name, category, url, logo
    }, function(result)
        if result and result.insertId then
            TriggerClientEvent('homecomputer:client:receiveTvChannelAdded', -1, {
                id = result.insertId,
                name = name,
                category = category,
                url = url,
                logo = logo
            })
        end
    end)
end)

-- Event to delete a channel
RegisterNetEvent('homecomputer:server:deleteTvChannel', function(channelId)
    if not channelId then return end
    MySQL.query('DELETE FROM homecomputer_channels WHERE id = ?', { tonumber(channelId) }, function(result)
        TriggerClientEvent('homecomputer:client:receiveTvChannelDeleted', -1, channelId)
    end)
end)


-- ==============================================================================
-- ─── RADIO APP SERVER INTEGRATION ─────────────────────────────────────────────
-- ==============================================================================

local radioChannels = {}
local radioConnectedPlayers = {}
local radioActiveTalkers = {}

local function GetPlayerNameStr(src)
    local Player = QBCore.Functions.GetPlayer(src)
    if Player then
        return Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname
    end
    return GetPlayerName(src)
end

local function UpdateRadioChannel(frequency)
    local channel = radioChannels[frequency]
    if not channel then return end
    
    for _, member in ipairs(channel.members) do
        TriggerClientEvent('homecomputer:client:radioUpdate', member.id, radioChannels)
    end
end

local function DisconnectRadioPlayer(playerId)
    local freq = radioConnectedPlayers[playerId]
    if not freq then return end
    
    local channel = radioChannels[freq]
    if channel then
        for i, member in ipairs(channel.members) do
            if member.id == playerId then
                table.remove(channel.members, i)
                break
            end
        end
        
        if #channel.members == 0 then
            radioChannels[freq] = nil
        else
            UpdateRadioChannel(freq)
        end
    end
    
    radioConnectedPlayers[playerId] = nil
    radioActiveTalkers[tostring(playerId)] = nil
    
    TriggerClientEvent('homecomputer:client:radioDisconnect', playerId)
    TriggerClientEvent('homecomputer:client:radioUpdate', playerId, {})
end

-- QBCore Callback
QBCore.Functions.CreateCallback('homecomputer:server:getRadioData', function(source, cb)
    local src = source
    cb({
        predefined = {
            { freq = '1', name = 'LSPD Dispatch', type = 'police' },
            { freq = '2', name = 'EMS Radio', type = 'ems' },
            { freq = '3', name = 'Sheriff Dispatch', type = 'sheriff' },
            { freq = '4', name = 'TAC 1', type = 'police' },
            { freq = '5', name = 'TAC 2', type = 'police' }
        },
        myServerId = src,
        channels = radioChannels
    })
end)

-- Events
RegisterNetEvent('homecomputer:server:connectRadio', function(frequency, password)
    local src = source
    if not frequency or frequency == '' then return end
    
    -- Disconnect first if already in a frequency
    DisconnectRadioPlayer(src)
    
    -- Set descriptions or labels for common frequencies
    local label = 'Standard Frequency'
    if frequency == '1' then label = 'LSPD Dispatch'
    elseif frequency == '2' then label = 'EMS Radio'
    elseif frequency == '3' then label = 'Sheriff Dispatch'
    elseif frequency == '4' then label = 'Tactical Frequency 1'
    elseif frequency == '5' then label = 'Tactical Frequency 2'
    end
    
    -- Create channel if it doesn't exist
    if not radioChannels[frequency] then
        radioChannels[frequency] = {
            label = label,
            creator = src,
            frequency = frequency,
            password = password or '',
            members = {},
            chat = {}
        }
    end
    
    -- Join members
    local charName = GetPlayerNameStr(src)
    table.insert(radioChannels[frequency].members, {
        id = src,
        name = charName
    })
    
    radioConnectedPlayers[src] = frequency
    
    TriggerClientEvent('homecomputer:client:radioConnect', src, frequency)
    UpdateRadioChannel(frequency)
end)

RegisterNetEvent('homecomputer:server:disconnectRadio', function()
    local src = source
    DisconnectRadioPlayer(src)
end)

RegisterNetEvent('homecomputer:server:sendRadioMessage', function(frequency, message)
    local src = source
    if not frequency or not message or message == '' then return end
    
    local channel = radioChannels[frequency]
    if not channel then return end
    
    local senderName = GetPlayerNameStr(src)
    table.insert(channel.chat, {
        id = src,
        name = senderName,
        content = message
    })
    
    UpdateRadioChannel(frequency)
end)

RegisterNetEvent('homecomputer:server:setRadioTalkingState', function(isTalking)
    local src = source
    radioActiveTalkers[tostring(src)] = isTalking
end)

-- Disconnect player on drop
AddEventHandler('playerDropped', function()
    local src = source
    DisconnectRadioPlayer(src)
end)

-- Broadcast speaker states loop
CreateThread(function()
    while true do
        Wait(500)
        for playerId, freq in pairs(radioConnectedPlayers) do
            TriggerClientEvent('homecomputer:client:radioUpdateTalkers', playerId, radioActiveTalkers)
        end
    end
end)



QBCore.Functions.CreateCallback('mdx_laptop:server:JobBoardApply', function(source, cb, jobName)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    
    if Player then
        -- Note: Ensure the jobName exists in your QBCore.Shared.Jobs table.
        Player.Functions.SetJob(jobName, 0)
        cb({ status = 'ok' })
    else
        cb({ status = 'error' })
    end
end)

-- ============================================================================
-- WARSTOCK CALLBACKS
-- ============================================================================
QBCore.Functions.CreateCallback('mdx_laptop:server:purchaseWarstock', function(source, cb, data)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then cb({ status = 'error', error = "Invalid Player." }) return end
    
    local totalCost = tonumber(data.totalCost) or 0
    if totalCost <= 0 then cb({ status = 'error', error = "Invalid order amount." }) return end
    
    if Player.Functions.RemoveMoney('bank', totalCost, "warstock-purchase") then
        for _, item in pairs(data.items) do
            Player.Functions.AddItem(item.id, tonumber(item.qty) or 1)
            TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items[item.id] or {name = item.id, label = item.id}, "add")
        end
        cb({ status = 'ok' })
    else
        cb({ status = 'error', error = "Insufficient bank funds! ($" .. totalCost .. " required)" })
    end
end)

-- ============================================================================
-- BUSINESS HUB PASSIVE INCOME SIMULATOR
-- ============================================================================
local PlayerBusinesses = {} -- [citizenid][bizId] = { supplies, stock, stockValue, lifetime, logs }
local BIZ_CONFIG = {
    ['cocaine'] = { maxStockValue = 420000, valuePerTick = 10000 },
    ['meth'] = { maxStockValue = 357000, valuePerTick = 8500 },
    ['bunker'] = { maxStockValue = 1050000, valuePerTick = 15000 },
    ['warehouse'] = { maxStockValue = 2220000, valuePerTick = 30000 },
    ['arena'] = { maxStockValue = 1000000, valuePerTick = 12000 }
}

-- Simulate business ticks every 60 seconds (for all online players with active businesses)
Citizen.CreateThread(function()
    while true do
        Wait(60000) -- 1 Minute
        for cid, businesses in pairs(PlayerBusinesses) do
            for bizId, bizData in pairs(businesses) do
                if bizData.supplies > 0 and bizData.stock < 100 then
                    -- Drain 5% supplies, add 5% stock, add value
                    local cfg = BIZ_CONFIG[bizId]
                    if cfg then
                        bizData.supplies = math.max(0, bizData.supplies - 5)
                        bizData.stock = math.min(100, bizData.stock + 5)
                        bizData.stockValue = math.min(cfg.maxStockValue, bizData.stockValue + cfg.valuePerTick)
                    end
                end
            end
        end
    end
end)

local function getPlayerBizData(cid, bizId)
    if not PlayerBusinesses[cid] then PlayerBusinesses[cid] = {} end
    if not PlayerBusinesses[cid][bizId] then
        PlayerBusinesses[cid][bizId] = {
            supplies = 0,
            stock = 0,
            stockValue = 0,
            lifetimeEarnings = 0,
            logs = { "[SYSTEM] Connected to SecuroServ Network." }
        }
    end
    return PlayerBusinesses[cid][bizId]
end

local function addBizLog(bizData, msg)
    table.insert(bizData.logs, msg)
    if #bizData.logs > 15 then table.remove(bizData.logs, 1) end
end

QBCore.Functions.CreateCallback('mdx_laptop:server:businessGetStatus', function(source, cb, bizId)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return cb({}) end
    local cid = Player.PlayerData.citizenid
    cb(getPlayerBizData(cid, bizId))
end)

QBCore.Functions.CreateCallback('mdx_laptop:server:businessBuySupplies', function(source, cb, data)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return cb({ status = 'error', error = "Invalid Player" }) end
    local cid = Player.PlayerData.citizenid
    local cost = tonumber(data.cost) or 75000
    
    local bizData = getPlayerBizData(cid, data.id)
    if bizData.supplies >= 100 then
        return cb({ status = 'error', error = "Supplies are already full!" })
    end
    
    if Player.Functions.RemoveMoney('bank', cost, "business-supplies") then
        bizData.supplies = 100
        addBizLog(bizData, "[ORDER] Supplies purchased for $" .. cost)
        cb({ status = 'ok', bizData = bizData })
    else
        cb({ status = 'error', error = "Insufficient funds in bank." })
    end
end)

QBCore.Functions.CreateCallback('mdx_laptop:server:businessSellStock', function(source, cb, bizId)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return cb({ status = 'error', error = "Invalid Player" }) end
    local cid = Player.PlayerData.citizenid
    
    local bizData = getPlayerBizData(cid, bizId)
    if bizData.stock <= 0 then
        return cb({ status = 'error', error = "You have no stock to sell!" })
    end
    
    local payout = bizData.stockValue
    Player.Functions.AddMoney('bank', payout, "business-sale")
    bizData.lifetimeEarnings = bizData.lifetimeEarnings + payout
    bizData.stock = 0
    bizData.stockValue = 0
    addBizLog(bizData, "[SALE] Stock successfully exported for $" .. payout)
    
    cb({ status = 'ok', bizData = bizData })
end)

-- SL-SCAM Reward Event
RegisterNetEvent('homecomputer:server:ScamReward', function(app)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    if app == 'cloner' then
        Player.Functions.AddItem('cloned_card', 1)
        TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items['cloned_card'], 'add')
    elseif app == 'printer' then
        Player.Functions.AddItem('fake_check', 1)
        TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items['fake_check'], 'add')
    end
end)

-- ─── SILK STREET DARKNET SERVER HANDLERS ──────────────────────────────────────

local ActiveDealers = {} -- [src] = true/false
local CurrentOrders = {} -- [src] = order or nil

-- 1. Contraband Purchase
RegisterNetEvent('homecomputer:server:purchaseSilkStreetContraband', function(data)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    local totalCost = tonumber(data.totalCost) or 0
    if totalCost <= 0 then return end

    if RemoveBankMoney(Player, totalCost, "silkstreet-contraband") then
        if data.delivery == 'direct' then
            -- Direct shipment: Credit items directly to player's QBCore inventory immediately
            local clothingItems = {
                torso = true, tshirt = true, arms = true, jeans = true, shoes = true,
                bag = true, chain = true, mask = true, helmet = true, ears = true,
                watches = true, glasses = true, bracelet = true
            }

            for _, item in ipairs(data.items) do
                local realId = Config.SilkAliases[item.id] or item.id
                local qty = tonumber(item.qty) or 1
                if clothingItems[realId] then
                    local info = {
                        id_clothe = math.random(1, 50),
                        id_texture = math.random(0, 15),
                        description = "Designer " .. (QBCore.Shared.Items[realId] and QBCore.Shared.Items[realId].label or realId)
                    }
                    AddInventoryItem(Player, realId, qty, info)
                else
                    AddInventoryItem(Player, realId, qty)
                end
                TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items[realId] or {name = realId, label = realId}, "add", qty)
            end
            TriggerClientEvent('QBCore:Notify', src, "Direct shipment completed! Items delivered directly to your inventory.", "success", 6000)
        else
            -- Delayed physical sequence (drone drop-off or courier)
            TriggerClientEvent('homecomputer:client:startSilkStreetDelivery', src, data.delivery, data.items)
        end
    else
        TriggerClientEvent('QBCore:Notify', src, "Insufficient bank funds!", "error")
    end
end)

-- 2. Claim Contraband Box items
RegisterNetEvent('homecomputer:server:claimContraband', function(items)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    local clothingItems = {
        torso = true, tshirt = true, arms = true, jeans = true, shoes = true,
        bag = true, chain = true, mask = true, helmet = true, ears = true,
        watches = true, glasses = true, bracelet = true
    }

    for _, item in ipairs(items) do
        local realId = Config.SilkAliases[item.id] or item.id
        local qty = tonumber(item.qty) or 1
        if clothingItems[realId] then
            local info = {
                id_clothe = math.random(1, 50),
                id_texture = math.random(0, 15),
                description = "Designer " .. (QBCore.Shared.Items[realId] and QBCore.Shared.Items[realId].label or realId)
            }
            AddInventoryItem(Player, realId, qty, info)
        else
            AddInventoryItem(Player, realId, qty)
        end
        TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items[realId] or {name = realId, label = realId}, "add", qty)
    end
end)

-- helper to generate a random 8-character plate
local function GenerateRandomPlate()
    local chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    local nums = "0123456789"
    local plate = ""
    for i = 1, 4 do
        local rand = math.random(1, #chars)
        plate = plate .. string.sub(chars, rand, rand)
    end
    for i = 1, 4 do
        local rand = math.random(1, #nums)
        plate = plate .. string.sub(nums, rand, rand)
    end
    return plate
end

local function IsPlateTaken(plate)
    local p = promise.new()
    MySQL.query("SELECT 1 FROM player_vehicles WHERE plate = ?", {plate}, function(result)
        p:resolve(result and #result > 0)
    end)
    return Citizen.Await(p)
end

local function GetUniquePlate()
    local plate = GenerateRandomPlate()
    while IsPlateTaken(plate) do
        plate = GenerateRandomPlate()
    end
    return plate
end

-- Direct Order Payment Callback
QBCore.Functions.CreateCallback('homecomputer:server:payDirectOrder', function(source, cb, items, totalCost)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return cb({ success = false, error = "Invalid Player." }) end

    local cost = tonumber(totalCost) or 0
    if cost <= 0 then return cb({ success = false, error = "Invalid cost." }) end

    if Player.Functions.RemoveMoney('bank', cost, "direct-order-purchase") then
        for _, item in ipairs(items) do
            if item.type == "motor" then
                local plate = GetUniquePlate()
                MySQL.insert("INSERT INTO player_vehicles (license, citizenid, vehicle, hash, mods, plate, garage, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", {
                    Player.PlayerData.license,
                    Player.PlayerData.citizenid,
                    item.id,
                    GetHashKey(item.id),
                    '{}',
                    plate,
                    'depot',
                    1
                }, function(insertId)
                    TriggerClientEvent('QBCore:Notify', src, "Vehicle " .. item.id:upper() .. " registered to depot! Plate: " .. plate, "success", 8000)
                end)
            end
        end
        cb({ success = true })
    else
        cb({ success = false, error = "Insufficient bank funds!" })
    end
end)

-- Direct Order Delivery Handler
RegisterNetEvent('homecomputer:server:deliverDirectItems', function(items)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    local clothingItems = {
        torso = true, tshirt = true, arms = true, jeans = true, shoes = true,
        bag = true, chain = true, mask = true, helmet = true, ears = true,
        watches = true, glasses = true, bracelet = true
    }

    for _, item in ipairs(items) do
        if item.type ~= "motor" then
            local qty = tonumber(item.qty) or 1
            if clothingItems[item.id] then
                local info = {
                    id_clothe = math.random(1, 50),
                    id_texture = math.random(0, 15),
                    description = "Designer " .. (QBCore.Shared.Items[item.id] and QBCore.Shared.Items[item.id].label or item.id)
                }
                AddInventoryItem(Player, item.id, qty, info)
            else
                AddInventoryItem(Player, item.id, qty)
            end
            TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items[item.id] or {name = item.id, label = item.id}, "add", qty)
        end
    end
end)

-- Direct Order Hire Bodyguard Callback
QBCore.Functions.CreateCallback('homecomputer:server:hireEliteGuard', function(source, cb)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return cb({ success = false, error = "Invalid Player." }) end

    if Player.Functions.RemoveMoney('bank', 15000, "direct-order-guard") or Player.Functions.RemoveMoney('cash', 15000, "direct-order-guard") then
        cb({ success = true })
    else
        cb({ success = false, error = "Insufficient funds! ($15,000 required)" })
    end
end)

-- Troll Control Player Callback
QBCore.Functions.CreateCallback('homecomputer:server:getTrollPlayers', function(source, cb)
    local players = {}
    local activePlayers = QBCore.Functions.GetPlayers()
    
    for _, playerId in ipairs(activePlayers) do
        local Player = QBCore.Functions.GetPlayer(playerId)
        if Player then
            table.insert(players, {
                id = playerId,
                name = Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname
            })
        end
    end
    cb(players)
end)

-- Troll Control Event Router
RegisterNetEvent('homecomputer:server:triggerTroll', function(targetId, actionId)
    local src = source
    local senderName = "Someone"
    
    local Player = QBCore.Functions.GetPlayer(src)
    if Player then
        senderName = Player.PlayerData.charinfo.firstname .. " " .. Player.PlayerData.charinfo.lastname
    else
        senderName = GetPlayerName(src)
    end
    
    local target = tonumber(targetId)
    if target then
        TriggerClientEvent('homecomputer:client:applyTroll', target, actionId, senderName)
    end
end)

-- Direct Order Blackout Trigger
RegisterNetEvent('homecomputer:server:triggerBlackout', function()
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    if Player.Functions.RemoveMoney('bank', 50000, "paige-blackout") then
        TriggerClientEvent('homecomputer:client:syncBlackout', -1, true)
        CreateThread(function()
            Wait(180000) -- 3 minutes
            TriggerClientEvent('homecomputer:client:syncBlackout', -1, false)
        end)
    else
        TriggerClientEvent('QBCore:Notify', src, "Insufficient bank funds for blackout hack.", "error")
    end
end)

-- Direct Order ATM Hack Reward
RegisterNetEvent('homecomputer:server:rewardATMHack', function(success)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    if success then
        local rewardAmt = math.random(3000, 7000)
        Player.Functions.AddMoney('cash', rewardAmt, "atm-hack-reward")
        TriggerClientEvent('QBCore:Notify', src, "ATM Bypass Complete! Secured $" .. rewardAmt .. " cash.", "success")
    else
        TriggerClientEvent('QBCore:Notify', src, "ATM bypass link compromised! Security alert dispatched.", "error")
    end
end)

-- 3. Hire Mercenary Guard Callback
QBCore.Functions.CreateCallback('homecomputer:server:silkStreetOrderMerc', function(source, cb)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return cb({ success = false, error = "Invalid Player." }) end

    if Player.Functions.RemoveMoney('bank', 30000, "silkstreet-merc") or Player.Functions.RemoveMoney('cash', 30000, "silkstreet-merc") then
        cb({ success = true })
    else
        cb({ success = false, error = "Insufficient funds! ($30,000 required)" })
    end
end)

-- 4. Toggle Drug Dealing status
QBCore.Functions.CreateCallback('homecomputer:server:silkStreetToggleDealing', function(source, cb, data)
    local src = source
    ActiveDealers[src] = data.active
    if not data.active then
        CurrentOrders[src] = nil
        TriggerClientEvent('homecomputer:client:receiveDrugOrder', src, nil)
    end
    cb({ success = true })
end)

-- 5. Complete Drug Sale Callback
QBCore.Functions.CreateCallback('homecomputer:server:completeDrugSale', function(source, cb)
    local src = source
    local order = CurrentOrders[src]
    if not order then return cb({ success = false, error = "No active order." }) end

    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return cb({ success = false, error = "Invalid Player." }) end

    local realId = Config.SilkAliases[order.itemId] or order.itemId
    local item = Player.Functions.GetItemByName(realId)

    if item and item.amount >= order.qty then
        if Player.Functions.RemoveItem(realId, order.qty) then
            TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items[realId] or {name = realId, label = realId}, "remove", order.qty)
            Player.Functions.AddMoney('cash', order.payout, "silk-drug-sale")
            CurrentOrders[src] = nil
            TriggerClientEvent('homecomputer:client:receiveDrugOrder', src, nil)
            cb({ success = true, payout = order.payout })
        else
            cb({ success = false, error = "Failed to remove items." })
        end
    else
        cb({ success = false, error = ("You do not have %dx %s!"):format(order.qty, QBCore.Shared.Items[realId] and QBCore.Shared.Items[realId].label or realId) })
    end
end)

-- 6. Claim Darknet Heist Contract Reward
RegisterNetEvent('homecomputer:server:claimContractReward', function(rewardAmt)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    
    local amount = tonumber(rewardAmt) or 10000
    Player.Functions.AddMoney('cash', amount, "silkstreet-contract")
    TriggerClientEvent('QBCore:Notify', src, ("Contract completed! Received $%s cash."):format(amount), "success")
end)

-- Clean up disconnected dealer state
AddEventHandler('playerDropped', function()
    local src = source
    ActiveDealers[src] = nil
    CurrentOrders[src] = nil
end)

-- takeFleecaLoan
QBCore.Functions.CreateCallback('homecomputer:server:takeFleecaLoan', function(source, cb, data)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then cb({ success = false }) return end
    local amount = tonumber(data.amount) or 10000
    local metadata = Player.PlayerData.metadata
    local loanData = metadata["loans"] or { debt = 0 }
    loanData.debt = loanData.debt + amount
    Player.Functions.SetMetaData("loans", loanData)
    Player.Functions.AddMoney('bank', amount, "fleeca-loan-credit")
    cb({ success = true, newDebt = loanData.debt })
end)

-- repayFleecaLoan
QBCore.Functions.CreateCallback('homecomputer:server:repayFleecaLoan', function(source, cb, data)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then cb({ success = false }) return end
    local amount = tonumber(data.amount) or 10000
    local metadata = Player.PlayerData.metadata
    local loanData = metadata["loans"] or { debt = 0 }
    if loanData.debt <= 0 then
        cb({ success = false, error = "You have no outstanding debt!" })
        return
    end
    if Player.Functions.RemoveMoney('bank', amount, "fleeca-loan-repay") then
        loanData.debt = math.max(0, loanData.debt - amount)
        Player.Functions.SetMetaData("loans", loanData)
        cb({ success = true, newDebt = loanData.debt })
    else
        cb({ success = false, error = "Insufficient bank funds." })
    end
end)

-- lombankWithdraw
QBCore.Functions.CreateCallback('homecomputer:server:lombankWithdraw', function(source, cb, data)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then cb({ success = false }) return end
    local amount = tonumber(data.amount) or 10000
    local metadata = Player.PlayerData.metadata
    local lomData = metadata["lombank"] or { balance = 0 }
    if (lomData.balance + amount) > 1000000 then
        cb({ success = false, error = "Credit limit of $1M reached!" })
        return
    end
    lomData.balance = lomData.balance + amount
    Player.Functions.SetMetaData("lombank", lomData)
    Player.Functions.AddMoney('bank', amount, "lombank-credit-withdrawal")
    cb({ success = true, newBalance = lomData.balance })
end)

-- lombankRepay
QBCore.Functions.CreateCallback('homecomputer:server:lombankRepay', function(source, cb, data)
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then cb({ success = false }) return end
    local amount = tonumber(data.amount) or 10000
    local metadata = Player.PlayerData.metadata
    local lomData = metadata["lombank"] or { balance = 0 }
    if lomData.balance <= 0 then
        cb({ success = false, error = "Your credit balance is fully paid!" })
        return
    end
    if Player.Functions.RemoveMoney('bank', amount, "lombank-credit-repay") then
        lomData.balance = math.max(0, lomData.balance - amount)
        Player.Functions.SetMetaData("lombank", lomData)
        cb({ success = true, newBalance = lomData.balance })
    else
        cb({ success = false, error = "Insufficient bank funds." })
    end
end)

-- Drug dealer dispatch simulation loop
CreateThread(function()
    while true do
        Wait(40000) -- Check every 40 seconds
        for src, active in pairs(ActiveDealers) do
            if active and not CurrentOrders[src] then
                local Player = QBCore.Functions.GetPlayer(src)
                if Player then
                    local drugs = {
                        { id = 'joint', label = 'Weed Joint', price = 200 },
                        { id = 'cokebaggy', label = 'Cocaine Baggy', price = 500 },
                        { id = 'crack_baggy', label = 'Crack Baggy', price = 600 },
                        { id = 'meth_crystals', label = 'Meth Crystals', price = 700 }
                    }
                    local selectedDrug = drugs[math.random(#drugs)]
                    local qty = math.random(1, 5)
                    local payout = math.floor(selectedDrug.price * qty * 1.5)
                    local clientNames = {"Lil T", "Big Dog", "Jojo", "Mickey", "Slick", "Buster", "Deano", "Stretch"}
                    local clientName = clientNames[math.random(#clientNames)]

                    local order = {
                        id = math.random(1000, 9999),
                        clientName = clientName,
                        itemId = selectedDrug.id,
                        itemLabel = selectedDrug.label,
                        qty = qty,
                        payout = payout
                    }
                    CurrentOrders[src] = order
                    TriggerClientEvent('homecomputer:client:receiveDrugOrder', src, order)
                end
            end
        end
    end
end)

-- Scan SP Heists directory
QBCore.Functions.CreateCallback('homecomputer:server:scanSPHeists', function(source, cb)
    local resourcePath = GetResourcePath(GetCurrentResourceName())
    if not resourcePath then return cb({}) end
    
    local folderPath = resourcePath .. "/sp_heists"
    folderPath = folderPath:gsub("/", "\\") -- Convert to Windows path separators
    
    local files = {}
    
    -- Run 'dir /B' to get raw file listing on Windows
    local cmd = ('dir "%s" /B'):format(folderPath)
    local handle = io.popen(cmd)
    if handle then
        for file in handle:lines() do
            if file and file ~= "" then
                table.insert(files, file)
            end
        end
        handle:close()
    else
        -- Fallback to 'ls' for Linux support
        cmd = ('ls "%s"'):format(resourcePath .. "/sp_heists")
        handle = io.popen(cmd)
        if handle then
            for file in handle:lines() do
                if file and file ~= "" then
                    table.insert(files, file)
                end
            end
            handle:close()
        end
    end
    
    cb(files)
end)

-- Scan Black Market directory
QBCore.Functions.CreateCallback('homecomputer:server:scanBlackMarket', function(source, cb)
    local resourcePath = GetResourcePath(GetCurrentResourceName())
    if not resourcePath then return cb({ dll = false, pdb = false }) end
    
    local folderPath = resourcePath .. "/black_market"
    folderPath = folderPath:gsub("/", "\\")
    
    local dllExists = false
    local pdbExists = false
    
    local cmd = ('dir "%s" /B'):format(folderPath)
    local handle = io.popen(cmd)
    if handle then
        for file in handle:lines() do
            if file == "TheBlackMarket.dll" then dllExists = true end
            if file == "TheBlackMarket.pdb" then pdbExists = true end
        end
        handle:close()
    else
        cmd = ('ls "%s"'):format(resourcePath .. "/black_market")
        handle = io.popen(cmd)
        if handle then
            for file in handle:lines() do
                if file == "TheBlackMarket.dll" then dllExists = true end
                if file == "TheBlackMarket.pdb" then pdbExists = true end
            end
            handle:close()
        end
    end
    
    cb({ dll = dllExists, pdb = pdbExists })
end)

-- Purchase Black Market Item
QBCore.Functions.CreateCallback('homecomputer:server:purchaseBlackMarketWeapon', function(source, cb, data)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return cb({ success = false, error = "Invalid Player" }) end
    
    local price = tonumber(data.price) or 0
    if price <= 0 then return cb({ success = false, error = "Invalid Price" }) end
    
    if RemoveBankMoney(Player, price, "blackmarket-arms") then
        if data.delivery == 'direct' then
            AddInventoryItem(Player, data.itemId, 1)
            TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items[data.itemId] or {name = data.itemId, label = data.itemId}, "add", 1)
            cb({ success = true, direct = true })
        else
            TriggerClientEvent('homecomputer:client:setBlackMarketDealer', src, data.itemId, data.dealerIndex)
            cb({ success = true, direct = false })
        end
    else
        cb({ success = false, error = "Insufficient bank funds!" })
    end
end)

-- Claim Black Market Weapon from Dealer
RegisterNetEvent('homecomputer:server:claimBlackMarketWeapon', function(weaponId)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    
    AddInventoryItem(Player, weaponId, 1)
    TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items[weaponId] or {name = weaponId, label = weaponId}, "add", 1)
    TriggerClientEvent('QBCore:Notify', src, "Weapon retrieved successfully from arms dealer!", "success")
end)

-- Scan SP Jobs directory for DriverJobs files
QBCore.Functions.CreateCallback('homecomputer:server:scanSPJobs', function(source, cb)
    local resourcePath = GetResourcePath(GetCurrentResourceName())
    if not resourcePath then return cb({ dll = false, jobsXml = false, tuningXml = false }) end
    
    local dllExists = false
    local xmlJobsExists = false
    local xmlTuningExists = false
    
    local f1 = io.open(resourcePath .. "/sp_jobs/DriverJobs.dll", "rb")
    if f1 then dllExists = true f1:close() end
    
    local f2 = io.open(resourcePath .. "/sp_jobs/DriverJobsData/Missions/Jobs.xml", "rb")
    if f2 then xmlJobsExists = true f2:close() end
    
    local f3 = io.open(resourcePath .. "/sp_jobs/DriverJobsData/Tuning/TuningRequests.xml", "rb")
    if f3 then xmlTuningExists = true f3:close() end
    
    cb({
        dll = dllExists,
        jobsXml = xmlJobsExists,
        tuningXml = xmlTuningExists
    })
end)

-- Claim Delivery Driver Job Payout
RegisterNetEvent('homecomputer:server:claimDriverPay', function(amount)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end
    
    -- Verify player job is driver
    if Player.PlayerData.job.name == "driver" then
        Player.Functions.AddMoney('cash', amount, "delivery-driver-payout")
        TriggerClientEvent('QBCore:Notify', src, ("Received $%d payout"):format(amount), "success")
    else
        print(("[home_computer] Warning: Player %s tried to claim driver pay without having driver job."):format(GetPlayerName(src)))
    end
end)



