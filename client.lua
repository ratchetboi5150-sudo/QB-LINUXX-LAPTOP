local QBCore = exports['qb-core']:GetCoreObject()

local isOpen       = false
local nearComputer = false
local playerNote   = ''
local loopRunning  = false  -- only true after the prop has been spawned

-- CCTV state variables (declared at top to prevent forward reference errors)
local activeCctvCam = nil
local activeCctvId = nil
local cctvRot = vector3(0.0, 0.0, 0.0)
local cctvFov = 60.0

local function CleanupCctvCamera()
    ClearFocus()
    ClearTimecycleModifier()
    RenderScriptCams(false, false, 0, true, true)
    if activeCctvCam then
        DestroyCam(activeCctvCam, false)
        activeCctvCam = nil
    end
    activeCctvId = nil
end

-- ─── INVENTORY CHECK ──────────────────────────────────────────────────────────

local function HasComputer()
    local Player = QBCore.Functions.GetPlayerData()
    if not Player or not Player.items then return false end
    for _, item in pairs(Player.items) do
        if item and item.name == Config.RequiredItem then
            return true
        end
    end
    return false
end

-- ─── HELPERS ──────────────────────────────────────────────────────────────────

local function DrawText3D(x, y, z, text)
    local onScreen, sx, sy = World3dToScreen2d(x, y, z)
    if not onScreen then return end

    local px, py, pz = table.unpack(GetGameplayCamCoords())
    local dist = #(vector3(px, py, pz) - vector3(x, y, z))
    local scale = (1 / dist) * 2.5
    local fov   = (1 / GetGameplayCamFov()) * 100

    SetTextScale(0.0 * scale * fov, 0.50 * scale * fov)
    SetTextFont(4)
    SetTextProportional(1)
    SetTextColour(255, 255, 255, 215)
    SetTextEntry('STRING')
    SetTextCentre(true)
    AddTextComponentString(text)
    DrawText(sx, sy - 0.015)

    local factor = (#text) / 370
    DrawRect(sx, sy - 0.0115, 0.030 + factor, 0.028, 0, 0, 0, 140)
end

local function DisableControls()
    for _, ctrl in ipairs(Config.DisabledControls) do
        DisableControlAction(0, ctrl, true)
    end
end

local function OpenNUI()
    isOpen = true
    SetNuiFocus(true, true)
    QBCore.Functions.TriggerCallback('homecomputer:server:getPlayerData', function(playerData)
        SendNUIMessage({ action = 'openComputer', note = playerNote, playerData = playerData })
    end)
end

local function CloseNUI()
    if not isOpen then return end -- idempotent: ignore duplicate close calls
    isOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'closeComputer' })
    CleanupCctvCamera()
end

-- ─── NOTE SYNC ────────────────────────────────────────────────────────────────

-- Safety: clear any lingering NUI focus from a crash/hot-restart
SetNuiFocus(false, false)

-- Request the player's saved note from the server on resource start
AddEventHandler('QBCore:Client:OnPlayerLoaded', function()
    TriggerServerEvent('homecomputer:server:getNote')
end)

RegisterNetEvent('homecomputer:client:receiveNote', function(note)
    playerNote = note or ''
end)

-- ─── NUI CALLBACKS ────────────────────────────────────────────────────────────

-- Close button / ESC inside NUI
RegisterNUICallback('closeComputer', function(data, cb)
    CloseNUI()
    cb('ok')
end)

-- Save note from Notepad app
RegisterNUICallback('saveNote', function(data, cb)
    if data and data.note then
        playerNote = data.note
        TriggerServerEvent('homecomputer:server:saveNote', data.note)
        QBCore.Functions.Notify('Note saved!', 'success', 2500)
    end
    cb('ok')
end)

-- Generic notify passthrough from NUI
RegisterNUICallback('notify', function(data, cb)
    if data and data.text then
        QBCore.Functions.Notify(data.text, data.type or 'primary', data.duration or 3000)
    end
    cb('ok')
end)

-- ─── MAIN TICK ────────────────────────────────────────────────────────────────

local function StartComputerLoop()
    if loopRunning then return end  -- prevent duplicate threads
    loopRunning = true

    CreateThread(function()
        while loopRunning do
            local sleep    = 500
            local ped      = PlayerPedId()
            local pedCoords = GetEntityCoords(ped)
            nearComputer   = false
            local nearCoords = nil

            -- Search for configured prop models in world
            for _, modelName in ipairs(Config.Props) do
                local model = GetHashKey(modelName)
                local obj   = GetClosestObjectOfType(
                    pedCoords.x, pedCoords.y, pedCoords.z,
                    Config.InteractDistance + 2.0,
                    model, false, false, false
                )
                if obj ~= 0 then
                    local objCoords = GetEntityCoords(obj)
                    local dist = #(pedCoords - objCoords)
                    if dist <= Config.InteractDistance then
                        nearComputer = true
                        nearCoords   = objCoords
                        sleep        = 0
                        break
                    end
                end
            end

            if nearComputer and nearCoords then
                if HasComputer() then
                    DrawText3D(nearCoords.x, nearCoords.y, nearCoords.z + 0.8, Config.DrawText)

                    if IsControlJustReleased(0, Config.InteractKey) and not isOpen then
                        OpenNUI()
                    end
                end
            end

            if isOpen then
                sleep = 0
                DisableControls()

                if IsControlJustReleased(0, 200) then -- Backspace / ESC fallback
                    CloseNUI()
                end
            end

            Wait(sleep)
        end
    end)
end

-- Triggered by whichever script spawns the computer prop.
-- Call TriggerClientEvent('homecomputer:client:propSpawned', playerId) from that script.
RegisterNetEvent('homecomputer:client:propSpawned', function()
    StartComputerLoop()
end)

-- ─── RESOURCE CLEANUP ─────────────────────────────────────────────────────────

local cameraLoopActive = false
local frontCam = false

local function stopCameraLoop()
    if cameraLoopActive then
        cameraLoopActive = false
        DestroyMobilePhone()
        CellCamActivate(false, false)
    end
end

local function startCameraLoop()
    if cameraLoopActive then return end
    cameraLoopActive = true
    
    CreateMobilePhone(1)
    CellCamActivate(true, true)
    
    CreateThread(function()
        while cameraLoopActive do
            if IsControlJustPressed(1, 27) then -- Arrow up / DPAD Up to flip camera
                frontCam = not frontCam
                Citizen.InvokeNative(0x2491A93618B7D838, frontCam)
            elseif IsControlJustPressed(1, 177) then -- Backspace / ESC to cancel
                stopCameraLoop()
                SendNUIMessage({ type = 'cameraStopped' })
            end
            
            HideHudComponentThisFrame(7)
            HideHudComponentThisFrame(8)
            HideHudComponentThisFrame(9)
            HideHudComponentThisFrame(6)
            HideHudComponentThisFrame(19)
            HideHudAndRadarThisFrame()
            Wait(0)
        end
    end)
end

AddEventHandler('onResourceStop', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then return end
    -- Force-release NUI focus regardless of isOpen state
    SetNuiFocus(false, false)
    if isOpen then
        isOpen = false
        SendNUIMessage({ action = 'closeComputer' })
    end
    stopCameraLoop()
    CleanupCctvCamera()
end)

-- ─── COMMAND ──────────────────────────────────────────────────────────────────

RegisterCommand('homepc', function()
    if HasComputer() then
        if not isOpen then
            OpenNUI()
        end
    else
        QBCore.Functions.Notify('You do not have a computer.', 'error', 3000)
    end
end, false)

-- ─── GLITCH STREAMING SIGNALLING & CALLBACKS ───────────────────────────────────

local myStream = nil
local activeStreams = {}

-- Export to let other resources control front camera
exports('CellFrontCamActivate', function(activate)
    Citizen.InvokeNative(0x2491A93618B7D838, activate)
end)

RegisterNUICallback("sendChatMessage", function(data, cb)
    TriggerServerEvent("utk_render:sendChatMessage", data)
    cb("ok")
end)

RegisterNUICallback("tryJoinStream", function(data, cb)
    local streamId = tostring(data.streamId)
    if activeStreams[streamId] or data.isSimulated then
        cb(GetPlayerServerId(PlayerId()))
    else
        cb(false)
    end
end)

RegisterNUICallback("joinStream", function(data, cb)
    TriggerServerEvent("utk_render:joinStream", data)
    cb("ok")
end)

RegisterNUICallback("newIceCandidateStreamer", function(data, cb)
    TriggerServerEvent("utk_render:newIceCandidateStreamer", data)
    cb("ok")
end)

RegisterNUICallback("newIceCandidateWatcher", function(data, cb)
    TriggerServerEvent("utk_render:newIceCandidateWatcher", data)
    cb("ok")
end)

RegisterNUICallback("startStreaming", function(data, cb)
    myStream = tostring(data.streamId)
    startCameraLoop()
    TriggerServerEvent("utk_render:startStreaming", data)
    cb("ok")
end)

RegisterNUICallback("sendRTCOffer", function(data, cb)
    TriggerServerEvent("utk_render:sendRTCOffer", data)
    cb("ok")
end)

RegisterNUICallback("sendRTCAnswer", function(data, cb)
    TriggerServerEvent("utk_render:sendRTCAnswer", data)
    cb("ok")
end)

RegisterNUICallback("leaveStream", function(data, cb)
    data.serverid = GetPlayerServerId(PlayerId())
    TriggerServerEvent("utk_render:leaveStream", data)
    cb("ok")
end)

RegisterNUICallback("stopStream", function(data, cb)
    stopCameraLoop()
    TriggerServerEvent("utk_render:stopStream", data)
    myStream = nil
    cb("ok")
end)

-- Fetch active streams from server
RegisterNUICallback("glitchGetStreams", function(data, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:getActiveStreams', function(streams)
        p:resolve(streams or {})
    end)
    cb(Citizen.Await(p))
end)

-- Net events from server to client NUI

RegisterNetEvent("utk_render:receiveChatMessage", function(data)
    SendNUIMessage({ type = "chatentry", streamId = data.streamId, message = data.message, sender = data.sender })
end)

RegisterNetEvent("utk_render:newStream", function(data)
    activeStreams[tostring(data.streamId)] = data
    SendNUIMessage({ type = "newStream", stream = data })
end)

RegisterNetEvent("utk_render:joinStream", function(data)
    if myStream == tostring(data.streamId) then
        SendNUIMessage({ type = "joinstream", streamId = data.streamId, serverid = data.serverid })
    end
end)

RegisterNetEvent("utk_render:sendRTCOffer", function(data)
    SendNUIMessage({ type = "receiveoffer", streamId = data.streamId, serverid = data.serverid, offer = data.offer })
end)

RegisterNetEvent("utk_render:sendRTCAnswer", function(data)
    if myStream == tostring(data.streamId) then
        SendNUIMessage({ type = "receiveanswer", streamId = data.streamId, serverid = data.serverid, answer = data.answer })
    end
end)

RegisterNetEvent("utk_render:newIceCandidateStreamer", function(data)
    SendNUIMessage({ type = "icecandidatestreamer", streamId = data.streamId, candidate = data.candidate })
end)

RegisterNetEvent("utk_render:newIceCandidateWatcher", function(data)
    if myStream == tostring(data.streamId) then
        SendNUIMessage({ type = "icecandidatewatcher", streamId = data.streamId, serverid = data.serverid, candidate = data.candidate })
    end
end)

RegisterNetEvent("utk_render:leaveStream", function(data)
    if myStream == tostring(data.streamId) then
        SendNUIMessage({ type = "leavestream", serverid = data.serverid })
    end
end)

RegisterNetEvent("utk_render:stopStream", function(data)
    local streamIdStr = tostring(data.streamId)
    activeStreams[streamIdStr] = nil
    if myStream ~= streamIdStr then
        SendNUIMessage({ type = "stopstream", streamId = data.streamId, serverid = data.serverid })
    else
        myStream = nil
    end
end)

-- ─── LIVE TV NUI CALLBACKS & NET EVENTS ──────────────────────────────────────────

RegisterNUICallback("getTvChannels", function(data, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:getTvChannels', function(channels)
        p:resolve(channels or {})
    end)
    cb(Citizen.Await(p))
end)

RegisterNUICallback("addTvChannel", function(data, cb)
    TriggerServerEvent("homecomputer:server:addTvChannel", data)
    cb("ok")
end)

RegisterNUICallback("deleteTvChannel", function(data, cb)
    TriggerServerEvent("homecomputer:server:deleteTvChannel", data.id)
    cb("ok")
end)

RegisterNetEvent("homecomputer:client:receiveTvChannelAdded", function(channel)
    SendNUIMessage({ action = "addTvChannel", channel = channel })
end)

RegisterNetEvent("homecomputer:client:receiveTvChannelDeleted", function(channelId)
    SendNUIMessage({ action = "deleteTvChannel", channelId = channelId })
end)

-- ─── CCTV APP NUI CALLBACKS & LOGIC ───────────────────────────────────────────

local MockCameras = {
    pacific = { coords = vector3(232.22, 221.32, 106.28), rotation = vector3(-15.0, 0.0, -100.0) },
    mazebank = { coords = vector3(-75.0, -820.0, 326.0), rotation = vector3(-20.0, 0.0, 130.0) },
    police = { coords = vector3(-860.0, -2410.0, 37.0), rotation = vector3(-15.0, 0.0, 140.0) },
    jewelry = { coords = vector3(-628.0, -232.0, 38.0), rotation = vector3(-20.0, 0.0, 35.0) },
    airport = { coords = vector3(-1035.0, -2730.0, 20.0), rotation = vector3(-10.0, 0.0, -30.0) },
    legion = { coords = vector3(195.0, -933.0, 35.0), rotation = vector3(-25.0, 0.0, 20.0) }
}

RegisterNUICallback("cctvGetCameras", function(data, cb)
    local cameras = {}
    local success, result = pcall(function()
        return exports['tk_cctv']:GetCameras()
    end)
    
    if success and result then
        for _, cam in ipairs(result) do
            table.insert(cameras, {
                id = cam.id,
                name = cam.name,
                group = cam.group,
                destroyed = cam.destroyed,
                isMock = false
            })
        end
    else
        -- Fallback to mock preset cameras
        local presets = {
            { id = "pacific", name = "Pacific Standard Bank", group = "Downtown", destroyed = false, isMock = true },
            { id = "mazebank", name = "Maze Bank Plaza", group = "Downtown", destroyed = false, isMock = true },
            { id = "police", name = "Vespucci Police Dept", group = "Vespucci", destroyed = false, isMock = true },
            { id = "jewelry", name = "Vangelico Jewelry", group = "Rockford Hills", destroyed = false, isMock = true },
            { id = "airport", name = "LS International Airport", group = "LSIA", destroyed = false, isMock = true },
            { id = "legion", name = "Legion Square Park", group = "Downtown", destroyed = false, isMock = true }
        }
        cameras = presets
    end
    cb(cameras)
end)

RegisterNUICallback("cctvSelectCamera", function(data, cb)
    local cameraId = data.id
    local cameraData = nil
    
    if activeCctvCam then
        DestroyCam(activeCctvCam, false)
        activeCctvCam = nil
    end
    
    local isMock = false
    if type(cameraId) == "string" and MockCameras[cameraId] then
        cameraData = MockCameras[cameraId]
        isMock = true
    else
        local success, result = pcall(function()
            return exports['tk_cctv']:GetCameraDataTable()[cameraId]
        end)
        if success and result then
            cameraData = result
        end
    end
    
    if not cameraData then
        cb('error')
        return
    end
    
    local coords = cameraData.coords
    local rotation = cameraData.rotation or cameraData.rot
    
    local cameraPosition = vector3(coords.x, coords.y, coords.z)
    
    activeCctvCam = CreateCam("DEFAULT_SCRIPTED_CAMERA", true)
    SetCamCoord(activeCctvCam, cameraPosition)
    
    cctvRot = vector3(rotation.x or 0.0, rotation.y or 0.0, rotation.z or 0.0)
    SetCamRot(activeCctvCam, cctvRot.x, cctvRot.y, cctvRot.z, 2)
    
    cctvFov = 60.0
    SetCamFov(activeCctvCam, cctvFov)
    
    SetCamActive(activeCctvCam, true)
    RenderScriptCams(true, false, 0, true, true)
    SetFocusPosAndVel(cameraPosition, 0.0, 0.0, 0.0)

    
    activeCctvId = cameraId
    cb('ok')
end)

RegisterNUICallback("cctvRotateCamera", function(data, cb)
    if activeCctvCam then
        local dx = data.dx or 0.0
        local dy = data.dy or 0.0
        
        local newZ = cctvRot.z - (dx * 0.25)
        local newX = math.max(-65.0, math.min(65.0, cctvRot.x - (dy * 0.25)))
        cctvRot = vector3(newX, cctvRot.y, newZ)
        
        SetCamRot(activeCctvCam, cctvRot.x, cctvRot.y, cctvRot.z, 2)
    end
    cb('ok')
end)

RegisterNUICallback("cctvZoomCamera", function(data, cb)
    if activeCctvCam then
        local zoom = data.zoom or 0.0
        cctvFov = math.max(15.0, math.min(90.0, cctvFov + zoom))
        SetCamFov(activeCctvCam, cctvFov)
    end
    cb('ok')
end)

RegisterNUICallback("cctvCloseCamera", function(data, cb)
    CleanupCctvCamera()
    cb('ok')
end)

-- ─── PICCHAT APP NUI CALLBACKS & INTERFACING ──────────────────────────────────

local function ExecutePicchatCallback(name, cb, ...)
    if GetResourceState("lb-picchat") == "started" then
        local args = {...}
        local success, result = pcall(function()
            return exports["lb-picchat"]:AwaitCallback(name, table.unpack(args))
        end)
        
        if success then
            cb(result)
            return
        end
    end
    cb(nil)
end

RegisterNUICallback("picchatGetLoggedIn", function(data, cb)
    ExecutePicchatCallback("getLoggedIn", cb)
end)

RegisterNUICallback("picchatLogin", function(data, cb)
    ExecutePicchatCallback("login", cb, data.username, data.password)
end)

RegisterNUICallback("picchatRegister", function(data, cb)
    ExecutePicchatCallback("createAccount", cb, {
        username = data.username,
        password = data.password,
        displayName = data.username
    })
end)

RegisterNUICallback("picchatLogout", function(data, cb)
    ExecutePicchatCallback("logout", cb)
end)

RegisterNUICallback("picchatGetContacts", function(data, cb)
    ExecutePicchatCallback("getContacts", cb)
end)

RegisterNUICallback("picchatGetMessages", function(data, cb)
    ExecutePicchatCallback("getMessages", cb, data.friendUsername)
end)

RegisterNUICallback("picchatSendMessage", function(data, cb)
    ExecutePicchatCallback("sendMessage", cb, data.username, data.content)
end)

RegisterNUICallback("picchatGetStories", function(data, cb)
    ExecutePicchatCallback("getStories", cb)
end)

RegisterNUICallback("picchatSendStory", function(data, cb)
    ExecutePicchatCallback("sendPost", cb, {}, data.link, false, { isStory = true })
end)

RegisterNUICallback("picchatSendPost", function(data, cb)
    ExecutePicchatCallback("sendPost", cb, data.recipients, data.link, false)
end)

RegisterNUICallback("picchatSearchUsers", function(data, cb)
    ExecutePicchatCallback("searchUsers", cb, data.search, 1)
end)

RegisterNUICallback("picchatAddFriend", function(data, cb)
    ExecutePicchatCallback("addFriend", cb, data.username)
end)

RegisterNUICallback("picchatMarkPostsAsOpened", function(data, cb)
    ExecutePicchatCallback("markPostsAsOpened", cb, data.posts or {}, data.username)
end)

RegisterNUICallback("picchatMarkStoriesAsViewed", function(data, cb)
    ExecutePicchatCallback("markStoriesAsViewed", cb, data.stories or {}, data.username)
end)


-- ==============================================================================
-- ─── RADIO APP INTEGRATION ────────────────────────────────────────────────────
-- ==============================================================================

local currentRadioFreq = nil
local currentRadioVolume = 50

-- NUI Callbacks
RegisterNUICallback('radioGetChannels', function(data, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:getRadioData', function(radioData)
        if radioData then
            radioData.volume = currentRadioVolume
            radioData.activeFreq = currentRadioFreq and tostring(currentRadioFreq) or nil
            p:resolve(radioData)
        else
            p:resolve({
                predefined = {
                    { freq = '1', name = 'LSPD Dispatch', type = 'police' },
                    { freq = '2', name = 'EMS Radio', type = 'ems' },
                    { freq = '3', name = 'Sheriff Dispatch', type = 'sheriff' },
                    { freq = '4', name = 'TAC 1', type = 'police' },
                    { freq = '5', name = 'TAC 2', type = 'police' }
                },
                myServerId = GetPlayerServerId(PlayerId()),
                activeFreq = currentRadioFreq and tostring(currentRadioFreq) or nil,
                volume = currentRadioVolume,
                channels = {}
            })
        end
    end)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('radioConnect', function(data, cb)
    if data and data.frequency then
        TriggerServerEvent('homecomputer:server:connectRadio', tostring(data.frequency), data.password)
        cb({ status = 'ok' })
    else
        cb({ status = 'error', message = 'No frequency specified' })
    end
end)

RegisterNUICallback('radioDisconnect', function(data, cb)
    TriggerServerEvent('homecomputer:server:disconnectRadio')
    cb({ status = 'ok' })
end)

RegisterNUICallback('radioChangeVolume', function(data, cb)
    if data and data.volume then
        currentRadioVolume = tonumber(data.volume)
        if GetResourceState('pma-voice') == 'started' then
            exports['pma-voice']:setRadioVolume(currentRadioVolume)
        elseif GetResourceState('mumble-voip') == 'started' then
            exports['mumble-voip']:setRadioVolume(currentRadioVolume)
        elseif GetResourceState('saltychat') == 'started' then
            exports['saltychat']:SetRadioVolume(currentRadioVolume)
        end
    end
    cb({ status = 'ok' })
end)

RegisterNUICallback('radioSendMessage', function(data, cb)
    if data and data.frequency and data.message then
        TriggerServerEvent('homecomputer:server:sendRadioMessage', tostring(data.frequency), data.message)
    end
    cb({ status = 'ok' })
end)

RegisterNUICallback('radioMutePlayer', function(data, cb)
    if data and data.player then
        if GetResourceState('pma-voice') == 'started' then
            exports['pma-voice']:toggleMutePlayer(tonumber(data.player))
        end
    end
    cb({ status = 'ok' })
end)

-- Events
RegisterNetEvent('homecomputer:client:radioConnect', function(frequency)
    if not frequency then return end
    local freqNum = tonumber(frequency)
    
    if GetResourceState('pma-voice') == 'started' then
        exports["pma-voice"]:SetRadioChannel(freqNum)
        exports['pma-voice']:setRadioVolume(currentRadioVolume)
        exports['pma-voice']:setVoiceProperty('radioEnabled', true)
        exports['pma-voice']:setVoiceProperty('micClicks', true)
    elseif GetResourceState('mumble-voip') == 'started' then
        exports["mumble-voip"]:SetRadioChannel(freqNum)
    elseif GetResourceState('saltychat') == 'started' then
        exports["saltychat"]:SetRadioChannel(freqNum)
        exports['saltychat']:SetRadioVolume(currentRadioVolume)
    end
    
    currentRadioFreq = freqNum
    SendNUIMessage({ action = 'radioSetFrequency', frequency = tostring(frequency) })
end)

RegisterNetEvent('homecomputer:client:radioDisconnect', function()
    if GetResourceState('pma-voice') == 'started' then
        exports["pma-voice"]:SetRadioChannel(0)
        exports['pma-voice']:setVoiceProperty('radioEnabled', false)
        exports['pma-voice']:setVoiceProperty('micClicks', false)
    elseif GetResourceState('mumble-voip') == 'started' then
        exports["mumble-voip"]:SetRadioChannel(0)
    elseif GetResourceState('saltychat') == 'started' then
        -- Saltychat disconnect
    end
    
    currentRadioFreq = nil
    SendNUIMessage({ action = 'radioSetFrequency', frequency = nil })
end)

RegisterNetEvent('homecomputer:client:radioUpdate', function(channels)
    SendNUIMessage({ action = 'radioSetChannels', channels = channels })
end)

RegisterNetEvent('homecomputer:client:radioUpdateTalkers', function(talkers)
    SendNUIMessage({ action = 'radioSetTalkers', talkers = talkers })
end)

-- Hook talking states
RegisterNetEvent('pma-voice:radioActive')
AddEventHandler('pma-voice:radioActive', function(isActive)
    if currentRadioFreq then
        TriggerServerEvent('homecomputer:server:setRadioTalkingState', isActive)
    end
end)

RegisterNetEvent('mumble:SetVoiceData')
AddEventHandler('mumble:SetVoiceData', function(voiceData, isTalking, radioActive)
    if currentRadioFreq and type(radioActive) == 'boolean' then
        TriggerServerEvent('homecomputer:server:setRadioTalkingState', radioActive)
    end
end)

-- ─── SILK STREET, DIRECT ORDER, LS TRADER APP LOGIC ─────────────────────────────

-- Receive synced state events internally
RegisterNetEvent('homecomputer:client:receivePlayerData', function(playerData)
    if isOpen then
        SendNUIMessage({
            action = "receivePlayerData",
            data = playerData
        })
    end
end)

RegisterNetEvent('homecomputer:client:receiveDrugOrder', function(order)
    if isOpen then
        SendNUIMessage({
            action = "receiveDrugOrder",
            order = order
        })
    end
end)

RegisterNetEvent('homecomputer:client:setDealingStatus', function(active)
    if isOpen then
        SendNUIMessage({
            action = "setDealingStatus",
            active = active
        })
    end
end)

-- NUI Callbacks routing to internal homecomputer logic

-- Silk Street
RegisterNUICallback('purchaseSilkStreetContraband', function(data, cb)
    TriggerServerEvent('homecomputer:server:purchaseSilkStreetContraband', data)
    cb('ok')
end)

RegisterNUICallback('silkStreetOrderMerc', function(_, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:silkStreetOrderMerc', function(res)
        p:resolve(res)
    end)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('silkStreetToggleDuty', function(data, cb)
    TriggerEvent('homecomputer:client:toggleSecurityDuty', data.active)
    cb('ok')
end)

RegisterNUICallback('acceptDarkContract', function(data, cb)
    TriggerEvent('homecomputer:client:startSilkStreetContract', data.id)
    cb(true)
end)

RegisterNUICallback('scanSPHeists', function(_, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:scanSPHeists', function(res)
        p:resolve(res)
    end)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('silkStreetToggleDealing', function(data, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:silkStreetToggleDealing', function(res)
        p:resolve(res)
    end, data)
    cb(Citizen.Await(p))
end)

-- Direct Order
RegisterNUICallback('chooseDirectDelivery', function(data, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:payDirectOrder', function(res)
        p:resolve(res)
    end, data.items, data.totalCost)
    local result = Citizen.Await(p)
    if result and result.success then
        TriggerEvent('homecomputer:client:startDirectDelivery', data.delivery, data.items)
        cb({ success = true })
    else
        cb({ success = false, error = (result and result.error) or "Payment failed" })
    end
end)

RegisterNUICallback('takeFleecaLoan', function(data, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:takeFleecaLoan', function(res)
        p:resolve(res)
    end, data)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('repayFleecaLoan', function(data, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:repayFleecaLoan', function(res)
        p:resolve(res)
    end, data)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('lombankWithdraw', function(data, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:lombankWithdraw', function(res)
        p:resolve(res)
    end, data)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('lombankRepay', function(data, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:lombankRepay', function(res)
        p:resolve(res)
    end, data)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('paigeTriggerBlackout', function(_, cb)
    TriggerServerEvent('homecomputer:server:triggerBlackout')
    cb('ok')
end)

RegisterNUICallback('paigeHackATM', function(_, cb)
    TriggerEvent('homecomputer:client:startATMHack')
    cb({ success = true })
end)

RegisterNUICallback('hireEliteGuard', function(_, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('homecomputer:server:hireEliteGuard', function(res)
        if res and res.success then
            TriggerEvent('homecomputer:client:spawnEliteGuard')
        end
        p:resolve(res)
    end)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('dismissEliteGuards', function(_, cb)
    TriggerEvent('homecomputer:client:dismissEliteGuards')
    cb('ok')
end)

RegisterNUICallback('executeCheat', function(data, cb)
    TriggerEvent('homecomputer:client:executeCheat', data.cheatId)
    cb({ success = true, message = "Payload injected successfully" })
end)

RegisterNUICallback('getPlayers', function(data, cb)
    QBCore.Functions.TriggerCallback('homecomputer:server:getTrollPlayers', function(players)
        cb(players or {})
    end)
end)

RegisterNUICallback('triggerTrollAction', function(data, cb)
    local targetId = data.targetId
    local action = data.action
    
    if targetId == 'self' then
        TriggerEvent('homecomputer:client:applyTroll', action, "System/Self")
        cb({ status = "ok" })
    else
        TriggerServerEvent('homecomputer:server:triggerTroll', targetId, action)
        cb({ status = "ok" })
    end
end)

-- LS Trader
RegisterNUICallback('lstrader-get-data', function(_, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('mdx_laptop:server:lstraderGetData', function(res)
        p:resolve(res)
    end)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('lstrader-save-wallet', function(data, cb)
    TriggerServerEvent('mdx_laptop:server:lstraderSaveWallet', data)
    cb('ok')
end)

RegisterNUICallback('lstrader-deposit-withdraw', function(data, cb)
    local p = promise.new()
    QBCore.Functions.TriggerCallback('mdx_laptop:server:lstraderDepositWithdraw', function(res)
        p:resolve(res)
    end, data.action, data.amount)
    cb(Citizen.Await(p))
end)

-- Edibles Kitchen Crafting Callback
RegisterNUICallback('craftEdible', function(data, cb)
    local p = promise.new()
    -- Close NUI focus temporarily or keep input disabled while cooking
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'closeComputer' }) -- close UI overlay temporarily
    
    QBCore.Functions.Progressbar("cook_edible", "Cooking Edible Infusion...", 6000, false, true, {
        disableMovement = true,
        disableCarMovement = true,
        disableMouse = false,
        disableCombat = true,
    }, {
        animDict = "amb@prop_human_bbq@male@idle_a",
        anim = "idle_b",
        flags = 49,
    }, {}, {}, function() -- Done
        ClearPedTasks(PlayerPedId())
        QBCore.Functions.TriggerCallback('homecomputer:server:craftEdible', function(res)
            -- Re-open the computer overlay
            SetNuiFocus(true, true)
            SendNUIMessage({ action = 'openComputer', note = playerNote }) -- re-open
            p:resolve(res)
        end, data)
    end, function() -- Cancel
        ClearPedTasks(PlayerPedId())
        SetNuiFocus(true, true)
        SendNUIMessage({ action = 'openComputer', note = playerNote }) -- re-open
        p:resolve({ success = false, error = "Cooking cancelled!" })
    end)
    cb(Citizen.Await(p))
end)

local function triggerLaptopCallback(name, cb, ...)
    if QBCore then
        QBCore.Functions.TriggerCallback(name, cb, ...)
    else
        cb(nil)
    end
end

RegisterNUICallback('jobboard-apply', function(data, cb)
    local p = promise.new()
    triggerLaptopCallback('mdx_laptop:server:JobBoardApply', function(res)
        p:resolve(res)
    end, data.job_id)
    cb(Citizen.Await(p))
end)

-- ============================================================================
-- WARSTOCK NUI CALLBACKS
-- ============================================================================
RegisterNUICallback('warstock-checkout', function(data, cb)
    local p = promise.new()
    triggerLaptopCallback('mdx_laptop:server:purchaseWarstock', function(res)
        p:resolve(res)
    end, data)
    cb(Citizen.Await(p))
end)

-- ============================================================================
-- BUSINESS HUB NUI CALLBACKS
-- ============================================================================
RegisterNUICallback('business-get-status', function(data, cb)
    local p = promise.new()
    triggerLaptopCallback('mdx_laptop:server:businessGetStatus', function(res)
        p:resolve(res)
    end, data.id)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('business-buy-supplies', function(data, cb)
    local p = promise.new()
    triggerLaptopCallback('mdx_laptop:server:businessBuySupplies', function(res)
        p:resolve(res)
    end, data)
    cb(Citizen.Await(p))
end)

RegisterNUICallback('business-sell-stock', function(data, cb)
    local p = promise.new()
    triggerLaptopCallback('mdx_laptop:server:businessSellStock', function(res)
        p:resolve(res)
    end, data.id)
    cb(Citizen.Await(p))
end)

-- Drone Pilot NUI Callback
RegisterNUICallback('launchDrone', function(data, cb)
    TriggerEvent('dz-drone:client:InitiateDrone')
    cb('ok')
end)

-- Arena War NUI Callback
RegisterNUICallback('launchArena', function(data, cb)
    ExecuteCommand('arena')
    cb('ok')
end)

-- SL-SCAM NUI Callback
RegisterNUICallback('scamResult', function(data, cb)
    if data.success then
        TriggerServerEvent('homecomputer:server:ScamReward', data.app)
    end
    cb('ok')
end)


-- ─── SILK STREET DARKNET CLIENT HANDLERS ──────────────────────────────────────

local activeGuards = {}
local drugBlip = nil
local buyerPed = nil
local activeDrugOrder = nil

-- Helper to safely load models
local function LoadModel(modelName)
    local modelHash = type(modelName) == 'string' and GetHashKey(modelName) or modelName
    if not IsModelInCdimage(modelHash) then return false end
    RequestModel(modelHash)
    while not HasModelLoaded(modelHash) do
        Wait(5)
    end
    return true
end

-- 1. Delivery Sequences Listener
RegisterNetEvent('homecomputer:client:startSilkStreetDelivery', function(deliveryType, items, isDirectOrder)
    if deliveryType == 'drone' then
        -- Start Drone Air-Drop
        QBCore.Functions.Notify("Contraband dispatching via high-tech surveillance drone.", "primary", 5000)
        
        CreateThread(function()
            local playerPed = PlayerPedId()
            local pCoords = GetEntityCoords(playerPed)
            local fwd = GetEntityForwardVector(playerPed)
            local spawnPos = pCoords + fwd * 12.0
            
            -- Find ground Z at spawn position
            local success, groundZ = GetGroundZFor_3dCoord(spawnPos.x, spawnPos.y, pCoords.z + 10.0, false)
            if not success then groundZ = pCoords.z - 1.0 end
            
            -- Spawn Drone
            if LoadModel('ch_prop_ch_drone_01a') then
                local droneSpawn = vector3(spawnPos.x, spawnPos.y, pCoords.z + 40.0)
                local droneObj = CreateObject(GetHashKey('ch_prop_ch_drone_01a'), droneSpawn.x, droneSpawn.y, droneSpawn.z, true, true, false)
                SetEntityHeading(droneObj, GetEntityHeading(playerPed))
                
                -- Descend drone
                for zOffset = 40.0, 15.0, -0.4 do
                    SetEntityCoords(droneObj, spawnPos.x, spawnPos.y, pCoords.z + zOffset, false, false, false, false)
                    Wait(50)
                end
                
                -- Spawn Crate and Parachute
                if LoadModel('prop_box_wood02a') and LoadModel('p_parachute_s') then
                    local crateObj = CreateObject(GetHashKey('prop_box_wood02a'), spawnPos.x, spawnPos.y, pCoords.z + 14.5, true, true, true)
                    local parachuteObj = CreateObject(GetHashKey('p_parachute_s'), spawnPos.x, spawnPos.y, pCoords.z + 16.5, true, true, true)
                    AttachEntityToEntity(parachuteObj, crateObj, 0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, false, false, false, false, 2, true)
                    
                    -- Crate slow descent
                    local crateZ = pCoords.z + 14.5
                    while crateZ > groundZ + 0.1 do
                        crateZ = crateZ - 0.10
                        SetEntityCoords(crateObj, spawnPos.x, spawnPos.y, crateZ, false, false, false, false)
                        Wait(50)
                    end
                    
                    -- Release Parachute
                    SetEntityCoords(crateObj, spawnPos.x, spawnPos.y, groundZ, false, false, false, false)
                    PlaceObjectOnGroundProperly(crateObj)
                    DeleteEntity(parachuteObj)
                    
                    -- Drone ascend and delete
                    CreateThread(function()
                        for zOffset = 15.0, 40.0, 0.5 do
                            SetEntityCoords(droneObj, spawnPos.x, spawnPos.y, pCoords.z + zOffset, false, false, false, false)
                            Wait(50)
                        end
                        DeleteEntity(droneObj)
                    end)
                    
                    -- Crate blip & collect loop
                    local boxBlip = AddBlipForEntity(crateObj)
                    SetBlipSprite(boxBlip, 501)
                    SetBlipColour(boxBlip, 1)
                    BeginTextCommandSetBlipName("STRING")
                    AddTextComponentString("Contraband Crate")
                    EndTextCommandSetBlipName(boxBlip)
                    
                    CreateThread(function()
                        local collected = false
                        while not collected and DoesEntityExist(crateObj) do
                            local sleep = 500
                            local playerCoords = GetEntityCoords(PlayerPedId())
                            local crateCoords = GetEntityCoords(crateObj)
                            local dist = #(playerCoords - crateCoords)
                            
                            if dist < 6.0 then
                                sleep = 0
                                if dist < 2.0 then
                                    DrawText3D(crateCoords.x, crateCoords.y, crateCoords.z + 0.8, "~g~[E]~w~ Retrieve Contraband")
                                    if IsControlJustReleased(0, 38) then
                                        collected = true
                                        TaskStartScenarioInPlace(PlayerPedId(), "PROP_HUMAN_BUM_BIN", 0, true)
                                        Wait(3000)
                                        ClearPedTasksImmediately(PlayerPedId())
                                        if isDirectOrder then
                                            TriggerServerEvent('homecomputer:server:deliverDirectItems', items)
                                        else
                                            TriggerServerEvent('homecomputer:server:claimContraband', items)
                                        end
                                        RemoveBlip(boxBlip)
                                        DeleteEntity(crateObj)
                                    end
                                else
                                    DrawText3D(crateCoords.x, crateCoords.y, crateCoords.z + 0.8, "Contraband Crate")
                                end
                            end
                            Wait(sleep)
                        end
                    end)
                end
            end
        end)
        
    elseif deliveryType == 'courier' then
        -- Start NPC Courier
        QBCore.Functions.Notify("Contraband dispatched via tactical courier. Monitor nearby roads.", "primary", 5000)
        
        CreateThread(function()
            local playerPed = PlayerPedId()
            local pCoords = GetEntityCoords(playerPed)
            
            -- Find road node for spawn
            local retVal, spawnPos, heading = GetClosestVehicleNodeWithHeading(pCoords.x + math.random(-60, 60), pCoords.y + math.random(-60, 60), pCoords.z, 1, 3, 0)
            if not retVal then spawnPos = pCoords + GetEntityForwardVector(playerPed) * 35.0 heading = 0.0 end
            
            if LoadModel('speedo') and LoadModel('s_m_m_ups_01') then
                local van = CreateVehicle(GetHashKey('speedo'), spawnPos.x, spawnPos.y, spawnPos.z, heading, true, false)
                local courier = CreatePedInsideVehicle(van, 4, GetHashKey('s_m_m_ups_01'), -1, true, false)
                
                SetVehicleDoorsLocked(van, 2)
                SetEntityInvincible(courier, true)
                SetBlockingOfNonTemporaryEvents(courier, true)
                
                -- Task courier to drive to player location
                TaskVehicleDriveToCoordLongrange(courier, van, pCoords.x, pCoords.y, pCoords.z, 12.0, 786603, 6.0)
                
                -- Wait until van reaches player area
                local arrived = false
                local timeout = 0
                while not arrived and timeout < 300 do
                    Wait(100)
                    timeout = timeout + 1
                    local vanCoords = GetEntityCoords(van)
                    if #(vanCoords - pCoords) < 18.0 then
                        arrived = true
                    end
                end
                
                -- Bring vehicle to stop and courier walk to player
                BringVehicleToHalt(van, 4.0, 1, false)
                Wait(1500)
                TaskLeaveVehicle(courier, van, 0)
                
                while IsPedInAnyVehicle(courier, false) do Wait(100) end
                Wait(500)
                
                -- Attach delivery box
                if LoadModel('hei_prop_heist_box') then
                    local box = CreateObject(GetHashKey('hei_prop_heist_box'), 0, 0, 0, true, true, true)
                    AttachEntityToEntity(box, courier, GetPedBoneIndex(courier, 57005), 0.1, 0.0, 0.0, 0.0, 90.0, 0.0, true, true, false, true, 1, true)
                    
                    -- Task courier to walk to player
                    TaskGoToEntity(courier, playerPed, -1, 1.5, 1.0, 1073741824, 0)
                    
                    local delivered = false
                    while not delivered do
                        local sleep = 500
                        local cCoords = GetEntityCoords(courier)
                        local dist = #(GetEntityCoords(PlayerPedId()) - cCoords)
                        
                        if dist < 5.0 then
                            sleep = 0
                            if dist < 2.0 then
                                TaskLookAtEntity(courier, PlayerPedId(), -1, 2048, 3)
                                DrawText3D(cCoords.x, cCoords.y, cCoords.z + 0.8, "~g~[E]~w~ Take Package")
                                if IsControlJustReleased(0, 38) then
                                    delivered = true
                                    TaskStartScenarioInPlace(PlayerPedId(), "PROP_HUMAN_BUM_BIN", 0, true)
                                    Wait(2000)
                                    ClearPedTasksImmediately(PlayerPedId())
                                    DeleteEntity(box)
                                    
                                    if isDirectOrder then
                                        TriggerServerEvent('homecomputer:server:deliverDirectItems', items)
                                    else
                                        TriggerServerEvent('homecomputer:server:claimContraband', items)
                                    end
                                    
                                    -- Task courier to return and leave
                                    TaskEnterVehicle(courier, van, -1, -1, 1.5, 1, 0)
                                    Wait(8000)
                                    TaskVehicleDriveWander(courier, van, 15.0, 786603)
                                    
                                    -- Cleanup thread
                                    CreateThread(function()
                                        Wait(15000)
                                        DeleteEntity(courier)
                                        DeleteEntity(van)
                                    end)
                                end
                            else
                                DrawText3D(cCoords.x, cCoords.y, cCoords.z + 0.8, "Courier")
                            end
                        end
                        Wait(sleep)
                    end
                end
            end
        end)
    end
end)

-- 2. Hire Tactical Mercenary (Merryweather)
RegisterNetEvent('homecomputer:client:spawnMercenary', function()
    if #activeGuards >= 3 then
        -- Dismiss oldest guard
        if DoesEntityExist(activeGuards[1]) then
            DeleteEntity(activeGuards[1])
        end
        table.remove(activeGuards, 1)
    end
    
    if LoadModel('s_m_y_blackops_01') then
        local playerPed = PlayerPedId()
        local pCoords = GetEntityCoords(playerPed)
        local guard = CreatePed(4, GetHashKey('s_m_y_blackops_01'), pCoords.x + 2.0, pCoords.y + 2.0, pCoords.z, 0.0, true, false)
        
        SetPedArmour(guard, 100)
        SetMaxPedHealth(guard, 200)
        SetEntityHealth(guard, 200)
        
        GiveWeaponToPed(guard, GetHashKey('weapon_combatsmg'), 500, false, true)
        
        -- Form squad group
        local pg = GetPedGroupIndex(playerPed)
        if pg == 0 then
            pg = CreateGroup(0)
            SetPedAsGroupLeader(playerPed, pg)
        end
        
        SetPedAsGroupMember(guard, pg)
        SetPedNeverLeavesGroup(guard, true)
        
        -- Combat properties
        SetPedCombatAttributes(guard, 5, true)
        SetPedCombatAttributes(guard, 46, true)
        SetPedCombatAttributes(guard, 2, true)
        SetPedAccuracy(guard, 80)
        
        table.insert(activeGuards, guard)
        QBCore.Functions.Notify("Merryweather Guard spawned and joined your squad.", "success")
    end
end)

-- Elite Bodyguards Spawner & Dismissal
local activeEliteGuards = {}

RegisterNetEvent('homecomputer:client:spawnEliteGuard', function()
    if #activeEliteGuards >= 3 then
        -- Dismiss oldest guard
        if DoesEntityExist(activeEliteGuards[1]) then
            DeleteEntity(activeEliteGuards[1])
        end
        table.remove(activeEliteGuards, 1)
    end
    
    if LoadModel('s_m_y_blackops_01') then
        local playerPed = PlayerPedId()
        local pCoords = GetEntityCoords(playerPed)
        local guard = CreatePed(4, GetHashKey('s_m_y_blackops_01'), pCoords.x + 2.0, pCoords.y + 2.0, pCoords.z, 0.0, true, false)
        
        SetPedArmour(guard, 100)
        SetMaxPedHealth(guard, 200)
        SetEntityHealth(guard, 200)
        
        GiveWeaponToPed(guard, GetHashKey('weapon_carbinerifle'), 500, false, true)
        
        -- Form squad group
        local pg = GetPedGroupIndex(playerPed)
        if pg == 0 then
            pg = CreateGroup(0)
            SetPedAsGroupLeader(playerPed, pg)
        end
        
        SetPedAsGroupMember(guard, pg)
        SetPedNeverLeavesGroup(guard, true)
        
        -- Combat properties
        SetPedCombatAttributes(guard, 5, true)
        SetPedCombatAttributes(guard, 46, true)
        SetPedCombatAttributes(guard, 2, true)
        SetPedAccuracy(guard, 80)
        
        table.insert(activeEliteGuards, guard)
        QBCore.Functions.Notify("Elite Tactical Bodyguard spawned and joined your squad.", "success")
    end
end)

RegisterNetEvent('homecomputer:client:dismissEliteGuards', function()
    for _, g in ipairs(activeEliteGuards) do
        if DoesEntityExist(g) then DeleteEntity(g) end
    end
    activeEliteGuards = {}
    QBCore.Functions.Notify("Elite Bodyguards dismissed.", "primary")
end)

-- Direct Order Delivery Sequences Selector
RegisterNetEvent('homecomputer:client:startDirectDelivery', function(deliveryType, items)
    if deliveryType == 'direct' then
        TriggerServerEvent('homecomputer:server:deliverDirectItems', items)
    else
        -- Pick randomly 50/50 drone drop or courier drop
        if math.random(1, 100) > 50 then
            TriggerEvent('homecomputer:client:startSilkStreetDelivery', 'drone', items, true)
        else
            TriggerEvent('homecomputer:client:startSilkStreetDelivery', 'courier', items, true)
        end
    end
end)

-- City Blackout synchronization handler
RegisterNetEvent('homecomputer:client:syncBlackout', function(active)
    SetArtificialLightsState(active)
    SetArtificialLightsStateAffectsVehicles(false)
    if active then
        QBCore.Functions.Notify("City grid blackout triggered!", "error", 5000)
    else
        QBCore.Functions.Notify("City grid power restored.", "success", 5000)
    end
end)

-- ATM hack initiator and link progress
RegisterNetEvent('homecomputer:client:startATMHack', function()
    local playerPed = PlayerPedId()
    local coords = GetEntityCoords(playerPed)
    local atmModels = {GetHashKey("prop_atm_01"), GetHashKey("prop_atm_02"), GetHashKey("prop_atm_03"), GetHashKey("prop_atm_04")}
    local closestAtm = 0

    for _, model in pairs(atmModels) do
        local obj = GetClosestObjectOfType(coords.x, coords.y, coords.z, 2.5, model, false, false, false)
        if DoesEntityExist(obj) then
            closestAtm = obj
            break
        end
    end

    if closestAtm ~= 0 then
        TaskStartScenarioInPlace(playerPed, "WORLD_HUMAN_STAND_MOBILE", 0, true)
        QBCore.Functions.Progressbar("atm_hack", "Intruding ATM firewall...", 6000, false, true, {
            disableMovement = true,
            disableCarMovement = true,
            disableMouse = false,
            disableCombat = true,
        }, {}, {}, {}, function()
            ClearPedTasks(playerPed)
            if math.random(1, 100) > 30 then
                TriggerServerEvent('homecomputer:server:rewardATMHack', true)
            else
                TriggerServerEvent('homecomputer:server:rewardATMHack', false)
                SetPlayerWantedLevel(PlayerId(), 3, false)
                SetPlayerWantedLevelNow(PlayerId(), false)
            end
        end, function()
            ClearPedTasks(playerPed)
        end)
    else
        QBCore.Functions.Notify("Please stand right in front of a bank ATM!", "error")
    end
end)

-- Intercept and trigger the client-side spawn on success
RegisterNetEvent('homecomputer:client:orderMercSuccess', function()
    TriggerEvent('homecomputer:client:spawnMercenary')
end)

-- 3. Security Duty & Drug Dealing status
RegisterNetEvent('homecomputer:client:toggleSecurityDuty', function(active)
    QBCore.Functions.Notify(("Security VIP Dispatch Duty toggled %s."):format(active and "ON" or "OFF"), "primary")
end)

-- 4. Drug Buyer Interactions
RegisterNetEvent('homecomputer:client:receiveDrugOrder', function(order)
    activeDrugOrder = order
    
    -- Cleanup previous blip/buyer if order is cleared
    if not order then
        if drugBlip then RemoveBlip(drugBlip) drugBlip = nil end
        if buyerPed then DeleteEntity(buyerPed) buyerPed = nil end
        return
    end
    
    -- Pick a random buyer location
    local loc = Config.SilkDeliveryLocations[math.random(#Config.SilkDeliveryLocations)]
    
    drugBlip = AddBlipForCoord(loc.coords.x, loc.coords.y, loc.coords.z)
    SetBlipSprite(drugBlip, 514)
    SetBlipColour(drugBlip, 2)
    SetBlipRoute(drugBlip, true)
    BeginTextCommandSetBlipName("STRING")
    AddTextComponentString("Silk Street Drug Buyer")
    EndTextCommandSetBlipName(drugBlip)
    
    QBCore.Functions.Notify(("Encrypted request received from %s! Buyer coordinates set on GPS."):format(order.clientName), "primary")
    
    CreateThread(function()
        local pedSpawned = false
        while activeDrugOrder and activeDrugOrder.id == order.id do
            local sleep = 500
            local playerCoords = GetEntityCoords(PlayerPedId())
            local dist = #(playerCoords - vector3(loc.coords.x, loc.coords.y, loc.coords.z))
            
            if dist < 45.0 then
                sleep = 200
                if not pedSpawned and LoadModel('a_m_m_eastsa_01') then
                    buyerPed = CreatePed(4, GetHashKey('a_m_m_eastsa_01'), loc.coords.x, loc.coords.y, loc.coords.z, loc.coords.w, true, false)
                    FreezeEntityPosition(buyerPed, true)
                    SetEntityInvincible(buyerPed, true)
                    SetBlockingOfNonTemporaryEvents(buyerPed, true)
                    pedSpawned = true
                end
                
                if dist < 2.0 and pedSpawned then
                    sleep = 0
                    DrawText3D(loc.coords.x, loc.coords.y, loc.coords.z + 0.8, "~g~[E]~w~ Hand over drugs to " .. order.clientName)
                    if IsControlJustReleased(0, 38) then
                        QBCore.Functions.TriggerCallback('homecomputer:server:completeDrugSale', function(res)
                            if res.success then
                                TaskStartScenarioInPlace(PlayerPedId(), "PROP_HUMAN_BUM_BIN", 0, true)
                                FreezeEntityPosition(buyerPed, false)
                                TaskStartScenarioInPlace(buyerPed, "PROP_HUMAN_BUM_BIN", 0, true)
                                Wait(2500)
                                ClearPedTasksImmediately(PlayerPedId())
                                ClearPedTasksImmediately(buyerPed)
                                
                                TaskWanderStandard(buyerPed, 10.0, 10)
                                RemoveBlip(drugBlip)
                                drugBlip = nil
                                
                                CreateThread(function()
                                    Wait(6000)
                                    DeleteEntity(buyerPed)
                                    buyerPed = nil
                                end)
                                
                                activeDrugOrder = nil
                            else
                                QBCore.Functions.Notify(res.error, "error")
                            end
                        end)
                    end
                end
            end
            Wait(sleep)
        end
    end)
end)

-- 5. Darknet Heist Contracts
RegisterNetEvent('homecomputer:client:startSilkStreetContract', function(contractId)
    local cData = Config.SilkContractLocations[contractId]
    if not cData then return end
    
    QBCore.Functions.Notify(("Route payload injected. Target location marked on GPS: %s"):format(cData.label), "primary", 5000)
    
    local contractBlip = AddBlipForCoord(cData.target.x, cData.target.y, cData.target.z)
    SetBlipSprite(contractBlip, 309)
    SetBlipColour(contractBlip, 1)
    SetBlipRoute(contractBlip, true)
    BeginTextCommandSetBlipName("STRING")
    AddTextComponentString("Contract Target")
    EndTextCommandSetBlipName(contractBlip)
    
    CreateThread(function()
        local areaReached = false
        local enemies = {}
        local propObj = nil
        local propBlip = nil
        
        while not areaReached do
            Wait(1000)
            local dist = #(GetEntityCoords(PlayerPedId()) - cData.target)
            if dist < 65.0 then
                areaReached = true
            end
        end
        
        -- Spawn Enemies and Guard the area
        for _, enemy in ipairs(cData.enemies) do
            if LoadModel(enemy.model) then
                local ped = CreatePed(4, GetHashKey(enemy.model), cData.target.x + enemy.offset.x, cData.target.y + enemy.offset.y, cData.target.z + enemy.offset.z, 0.0, true, false)
                GiveWeaponToPed(ped, GetHashKey(enemy.weapon), 250, false, true)
                SetPedRelationshipGroupHash(ped, GetHashKey("HATES_PLAYER"))
                SetPedCombatAttributes(ped, 5, true)
                SetPedCombatAttributes(ped, 46, true)
                SetPedAccuracy(ped, 65)
                table.insert(enemies, ped)
            end
        end
        
        -- Spawn Contraband Target Prop
        if LoadModel(cData.propModel) then
            propObj = CreateObject(GetHashKey(cData.propModel), cData.target.x, cData.target.y, cData.target.z, true, true, true)
            PlaceObjectOnGroundProperly(propObj)
            
            propBlip = AddBlipForEntity(propObj)
            SetBlipSprite(propBlip, 501)
            SetBlipColour(propBlip, 5)
            
            local secured = false
            while not secured do
                local sleep = 500
                local pCoords = GetEntityCoords(PlayerPedId())
                local propCoords = GetEntityCoords(propObj)
                local dist = #(pCoords - propCoords)
                
                if dist < 6.0 then
                    sleep = 0
                    if dist < 2.0 then
                        DrawText3D(propCoords.x, propCoords.y, propCoords.z + 0.8, "~g~[E]~w~ Secure Contraband")
                        if IsControlJustReleased(0, 38) then
                            secured = true
                            TaskStartScenarioInPlace(PlayerPedId(), "PROP_HUMAN_BUM_BIN", 0, true)
                            Wait(2500)
                            ClearPedTasksImmediately(PlayerPedId())
                            
                            DeleteEntity(propObj)
                            RemoveBlip(propBlip)
                            RemoveBlip(contractBlip)
                            
                            -- Proceed to dropoff point
                            local dropoff = Config.SilkDropoffs[math.random(#Config.SilkDropoffs)]
                            local dropBlip = AddBlipForCoord(dropoff.x, dropoff.y, dropoff.z)
                            SetBlipSprite(dropBlip, 501)
                            SetBlipColour(dropBlip, 2)
                            SetBlipRoute(dropBlip, true)
                            BeginTextCommandSetBlipName("STRING")
                            AddTextComponentString("Contract Drop-off")
                            EndTextCommandSetBlipName(dropBlip)
                            
                            QBCore.Functions.Notify("Contraband secured! Deliver it to the drop-off coordinates.", "success")
                            
                            local delivered = false
                            while not delivered do
                                local dropSleep = 500
                                local pPos = GetEntityCoords(PlayerPedId())
                                local dropDist = #(pPos - dropoff)
                                
                                if dropDist < 8.0 then
                                    dropSleep = 0
                                    DrawMarker(1, dropoff.x, dropoff.y, dropoff.z - 1.0, 0, 0, 0, 0, 0, 0, 1.5, 1.5, 1.0, 0, 255, 0, 150, false, true, 2, false, nil, nil, false)
                                    if dropDist < 2.0 then
                                        DrawText3D(dropoff.x, dropoff.y, dropoff.z + 0.8, "~g~[E]~w~ Handover Contraband")
                                        if IsControlJustReleased(0, 38) then
                                            delivered = true
                                            TaskStartScenarioInPlace(PlayerPedId(), "PROP_HUMAN_BUM_BIN", 0, true)
                                            Wait(2500)
                                            ClearPedTasksImmediately(PlayerPedId())
                                            
                                            RemoveBlip(dropBlip)
                                            TriggerServerEvent('homecomputer:server:claimContractReward', cData.reward)
                                            
                                            -- Clean up enemies
                                            for _, enemy in ipairs(enemies) do
                                                if DoesEntityExist(enemy) then
                                                    DeleteEntity(enemy)
                                                end
                                            end
                                        end
                                    end
                                end
                                Wait(dropSleep)
                            end
                        end
                    else
                        DrawText3D(propCoords.x, propCoords.y, propCoords.z + 0.8, "Contraband Package")
                    end
                end
                Wait(sleep)
            end
        end
    end)
end)

-- Clean up spawned guards on resource stop
AddEventHandler('onResourceStop', function(resName)
    if resName ~= GetCurrentResourceName() then return end
    for _, g in ipairs(activeGuards) do
        if DoesEntityExist(g) then DeleteEntity(g) end
    end
    for _, g in ipairs(activeEliteGuards) do
        if DoesEntityExist(g) then DeleteEntity(g) end
    end
    if DoesEntityExist(buyerPed) then DeleteEntity(buyerPed) end
end)

-- HACKZ Cheat States
local flamingActive = false
local explosiveActive = false
local explosiveMeleeActive = false
local lowGravityActive = false
local drunkActive = false
local slowMoLevel = 0
local deadeyeActive = false
local invincibilityActive = false
local fastRunActive = false
local slipperyActive = false
local weatherCheatIdx = 1

-- Tick thread for active cheats
CreateThread(function()
    while true do
        local sleep = 500
        local player = PlayerId()
        local ped = PlayerPedId()
        
        if flamingActive or explosiveActive or explosiveMeleeActive or lowGravityActive or deadeyeActive or fastRunActive or slipperyActive then
            sleep = 0
            
            if flamingActive then
                SetFireAmmoThisFrame(player)
            end
            if explosiveActive then
                SetExplosiveAmmoThisFrame(player)
            end
            if explosiveMeleeActive then
                SetExplosiveMeleeThisFrame(player)
            end
            if lowGravityActive then
                SetGravityLevel(1)
            end
            if deadeyeActive and IsPlayerFreeAiming(player) then
                SetTimeScale(0.3)
            elseif deadeyeActive then
                SetTimeScale(1.0)
            end
            if fastRunActive then
                SetRunSprintMultiplierForPlayer(player, 1.49)
            end
            if slipperyActive then
                local veh = GetVehiclePedIsIn(ped, false)
                if veh ~= 0 and GetPedInVehicleSeat(veh, -1) == ped then
                    SetVehicleReduceGrip(veh, true)
                end
            end
        end
        Wait(sleep)
    end
end)

-- Vehicle Spawner helper
local function SpawnCheatVehicle(modelName)
    local hash = GetHashKey(modelName)
    if not IsModelInCdimage(hash) then
        QBCore.Functions.Notify("Invalid vehicle model or not loaded on server.", "error")
        return
    end
    
    RequestModel(hash)
    local timeout = 5000
    while not HasModelLoaded(hash) and timeout > 0 do
        Wait(10)
        timeout = timeout - 10
    end
    
    if not HasModelLoaded(hash) then
        QBCore.Functions.Notify("Failed to load vehicle model.", "error")
        return
    end
    
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)
    local fwd = GetEntityForwardVector(ped)
    local spawnPos = coords + fwd * 4.0
    
    local veh = CreateVehicle(hash, spawnPos.x, spawnPos.y, spawnPos.z, heading, true, false)
    SetVehicleOnGroundProperly(veh)
    TaskWarpPedIntoVehicle(ped, veh, -1)
    
    local plate = QBCore.Functions.GetPlate(veh)
    TriggerEvent("vehiclekeys:client:SetOwner", plate)
    SetModelAsNoLongerNeeded(hash)
    QBCore.Functions.Notify("Cheat Spawner: " .. modelName:upper() .. " spawned!", "success")
end

-- Cheat execution handler
RegisterNetEvent('homecomputer:client:executeCheat', function(cheatId)
    local ped = PlayerPedId()
    local player = PlayerId()
    local coords = GetEntityCoords(ped)
    
    if cheatId == "random_explosion" then
        AddExplosion(coords.x + math.random(-5, 5), coords.y + math.random(-5, 5), coords.z, 0, 1.0, true, false, 1.0)
        QBCore.Functions.Notify("System overload! EMF static detected.", "error")
        
    elseif cheatId == "incendiary_ammo" then
        flamingActive = not flamingActive
        QBCore.Functions.Notify("Flaming Bullets: " .. (flamingActive and "ENABLED" or "DISABLED"), flamingActive and "success" or "error")
        
    elseif cheatId == "explosive_ammo" then
        explosiveActive = not explosiveActive
        QBCore.Functions.Notify("Explosive Bullets: " .. (explosiveActive and "ENABLED" or "DISABLED"), explosiveActive and "success" or "error")
        
    elseif cheatId == "explosive_melee" then
        explosiveMeleeActive = not explosiveMeleeActive
        QBCore.Functions.Notify("Explosive Melee: " .. (explosiveMeleeActive and "ENABLED" or "DISABLED"), explosiveMeleeActive and "success" or "error")
        
    elseif cheatId == "give_parachute" then
        GiveWeaponToPed(ped, GetHashKey("GADGET_PARACHUTE"), 1, false, true)
        QBCore.Functions.Notify("Parachute deployed to tactical harness.", "success")
        
    elseif cheatId == "low_gravity" then
        lowGravityActive = not lowGravityActive
        if not lowGravityActive then SetGravityLevel(0) end
        QBCore.Functions.Notify("Low Gravity: " .. (lowGravityActive and "ENABLED" or "DISABLED"), lowGravityActive and "success" or "error")
        
    elseif cheatId == "drunk_mode" then
        drunkActive = not drunkActive
        if drunkActive then
            RequestAnimSet("move_m@drunk@verydrunk")
            while not HasAnimSetLoaded("move_m@drunk@verydrunk") do Wait(5) end
            SetPedMovementClipset(ped, "move_m@drunk@verydrunk", 1.0)
            ShakeGameplayCam("DRUNK_SHAKE", 1.0)
            SetTimecycleModifier("spectator5")
        else
            ResetPedMovementClipset(ped, 1.0)
            StopGameplayCamShaking(true)
            ClearTimecycleModifier()
        end
        QBCore.Functions.Notify("Drunk Mode: " .. (drunkActive and "ENABLED" or "DISABLED"), drunkActive and "success" or "error")
        
    elseif cheatId == "power_up" then
        SetEntityHealth(ped, GetEntityMaxHealth(ped))
        SetPedArmour(ped, 100)
        RestorePlayerStamina(player, 1.0)
        QBCore.Functions.Notify("Core Vitals & Stamina fully recharged.", "success")
        
    elseif cheatId == "slow_mo" then
        slowMoLevel = (slowMoLevel + 1) % 4
        if slowMoLevel == 0 then
            SetTimeScale(1.0)
            QBCore.Functions.Notify("Simulation Time Scale: NORMAL", "primary")
        elseif slowMoLevel == 1 then
            SetTimeScale(0.7)
            QBCore.Functions.Notify("Simulation Time Scale: SLOW (Level 1)", "success")
        elseif slowMoLevel == 2 then
            SetTimeScale(0.5)
            QBCore.Functions.Notify("Simulation Time Scale: SLOWER (Level 2)", "success")
        elseif slowMoLevel == 3 then
            SetTimeScale(0.3)
            QBCore.Functions.Notify("Simulation Time Scale: SLOWEST (Level 3)", "success")
        end
        
    elseif cheatId == "skyfall" then
        SetEntityCoords(ped, coords.x, coords.y, coords.z + 400.0, false, false, false, false)
        GiveWeaponToPed(ped, GetHashKey("GADGET_PARACHUTE"), 1, false, true)
        CreateThread(function()
            Wait(500)
            TaskSkyDive(ped)
        end)
        QBCore.Functions.Notify("Tactical Skyfall initiated. Skydive bypass engaged.", "success")
        
    elseif cheatId == "spawn_bmx" then
        SpawnCheatVehicle('bmx')
    elseif cheatId == "spawn_comet" then
        SpawnCheatVehicle('comet2')
    elseif cheatId == "spawn_rocket" then
        SpawnCheatVehicle('pcj')
    elseif cheatId == "spawn_sanchez" then
        SpawnCheatVehicle('sanchez')
    elseif cheatId == "spawn_rapid_gt" then
        SpawnCheatVehicle('rapidgt')
    elseif cheatId == "spawn_limo" then
        SpawnCheatVehicle('stretch')
    elseif cheatId == "spawn_trash" then
        SpawnCheatVehicle('trash')
    elseif cheatId == "spawn_buzzard" then
        SpawnCheatVehicle('buzzard2')
    elseif cheatId == "spawn_deathcar" then
        SpawnCheatVehicle('dukes2')
    elseif cheatId == "spawn_bubbles" then
        SpawnCheatVehicle('submersible2')
    elseif cheatId == "spawn_extinct" then
        SpawnCheatVehicle('dodo')
    elseif cheatId == "spawn_stunt" then
        SpawnCheatVehicle('stunt')
        
    elseif cheatId == "deadeye" then
        deadeyeActive = not deadeyeActive
        if not deadeyeActive then SetTimeScale(1.0) end
        QBCore.Functions.Notify("Slow-Mo Aiming: " .. (deadeyeActive and "ENABLED" or "DISABLED"), deadeyeActive and "success" or "error")
        
    elseif cheatId == "painkiller" then
        invincibilityActive = not invincibilityActive
        SetPlayerInvincible(player, invincibilityActive)
        QBCore.Functions.Notify("Invincibility: " .. (invincibilityActive and "ENABLED" or "DISABLED"), invincibilityActive and "success" or "error")
        
    elseif cheatId == "turtle" then
        SetEntityHealth(ped, GetEntityMaxHealth(ped))
        SetPedArmour(ped, 100)
        QBCore.Functions.Notify("Max Health & Armor restored.", "success")
        
    elseif cheatId == "catchme" then
        fastRunActive = not fastRunActive
        if not fastRunActive then SetRunSprintMultiplierForPlayer(player, 1.0) end
        QBCore.Functions.Notify("Sprint Speed Multiplier: " .. (fastRunActive and "1.49x" or "NORMAL"), fastRunActive and "success" or "error")
        
    elseif cheatId == "fugitive" then
        local wl = GetPlayerWantedLevel(player)
        SetPlayerWantedLevel(player, math.min(5, wl + 1), false)
        SetPlayerWantedLevelNow(player, false)
        QBCore.Functions.Notify("Wanted Level raised.", "error")
        
    elseif cheatId == "lawyerup" then
        ClearPlayerWantedLevel(player)
        QBCore.Functions.Notify("Wanted Level cleared.", "success")
        
    elseif cheatId == "makeitrain" then
        local weathers = {"EXTRASUNNY", "CLEAR", "CLOUDS", "SMOG", "FOGGY", "OVERCAST", "RAIN", "THUNDER", "CLEARING", "NEUTRAL", "SNOW", "BLIZZARD", "SNOWLIGHT", "XMAS", "HALLOWEEN"}
        if not weatherCheatIdx then weatherCheatIdx = 1 end
        weatherCheatIdx = (weatherCheatIdx % #weathers) + 1
        SetWeatherTypeOvertimePersist(weathers[weatherCheatIdx], 5.0)
        QBCore.Functions.Notify("Weather override active: " .. weathers[weatherCheatIdx], "success")
        
    elseif cheatId == "snowday" then
        slipperyActive = not slipperyActive
        if not slipperyActive then
            local veh = GetVehiclePedIsIn(ped, false)
            if veh ~= 0 then SetVehicleReduceGrip(veh, false) end
        end
        QBCore.Functions.Notify("Reduced Traction (Drifting): " .. (slipperyActive and "ENABLED" or "DISABLED"), slipperyActive and "success" or "error")
        
    elseif cheatId == "dismiss_all_bodyguards" then
        TriggerEvent('homecomputer:client:dismissEliteGuards')
        for _, g in ipairs(activeGuards) do
            if DoesEntityExist(g) then DeleteEntity(g) end
        end
        activeGuards = {}
        QBCore.Functions.Notify("All bodyguard forces dismissed.", "primary")
    end
end)

-- Troll Control Action applier
RegisterNetEvent('homecomputer:client:applyTroll', function(actionId, attackerName)
    local playerPed = PlayerPedId()
    
    QBCore.Functions.Notify("Troll Alert: " .. attackerName .. " triggered " .. actionId .. " on you!", "error", 5000)
    
    -- PHYSICS & CHAOS CATEGORY
    if actionId == "ragdoll" then
        CreateThread(function()
            local endTimer = GetGameTimer() + 6000
            while GetGameTimer() < endTimer do
                SetPedToRagdoll(playerPed, 1000, 1000, 0, 0, 0, 0)
                Wait(500)
            end
        end)
        
    elseif actionId == "launch_sky" then
        local coords = GetEntityCoords(playerPed)
        SetEntityCoords(playerPed, coords.x, coords.y, coords.z + 80.0, false, false, false, false)
        GiveWeaponToPed(playerPed, GetHashKey("GADGET_PARACHUTE"), 1, false, true)
        
    elseif actionId == "super_jump" then
        CreateThread(function()
            local endTimer = GetGameTimer() + 20000
            while GetGameTimer() < endTimer do
                SetSuperJumpThisFrame(PlayerId())
                Wait(0)
            end
        end)
        
    elseif actionId == "drunk_effect" then
        SetPedIsDrunk(playerPed, true)
        SetPedMotionBlur(playerPed, true)
        SetPedConfigFlag(playerPed, 100, true)
        CreateThread(function()
            Wait(25000)
            SetPedIsDrunk(playerPed, false)
            SetPedMotionBlur(playerPed, false)
        end)
        
    elseif actionId == "moon_gravity" then
        SetGravityLevel(1) -- Low gravity
        CreateThread(function()
            Wait(20000)
            SetGravityLevel(0) -- Normal gravity
        end)
        
    elseif actionId == "zero_gravity" then
        SetGravityLevel(3) -- Very low/zero gravity
        CreateThread(function()
            Wait(15000)
            SetGravityLevel(0) -- Normal
        end)
        
    -- VEHICLE CHAOS CATEGORY
    elseif actionId == "burst_tires" then
        if IsPedInAnyVehicle(playerPed, false) then
            local vehicle = GetVehiclePedIsIn(playerPed, false)
            for i = 0, 7 do
                SetVehicleTyreBurst(vehicle, i, true, 1000.0)
            end
        end
        
    elseif actionId == "explode_car" then
        if IsPedInAnyVehicle(playerPed, false) then
            local vehicle = GetVehiclePedIsIn(playerPed, false)
            SetVehicleEngineHealth(vehicle, -4000) -- Blows up engine / starts fire
        end
        
    elseif actionId == "brake_failure" then
        if IsPedInAnyVehicle(playerPed, false) then
            local vehicle = GetVehiclePedIsIn(playerPed, false)
            CreateThread(function()
                local endTimer = GetGameTimer() + 15000
                while GetGameTimer() < endTimer do
                    SetVehicleBrakesCanLooseTraction(vehicle, true)
                    SetVehicleHandbrake(vehicle, false)
                    SetVehicleEnginePowerMultiplier(vehicle, 0.0) -- Nullifies throttle/brakes control
                    Wait(0)
                end
            end)
        end
        
    elseif actionId == "stuck_gas" then
        if IsPedInAnyVehicle(playerPed, false) then
            local vehicle = GetVehiclePedIsIn(playerPed, false)
            CreateThread(function()
                local endTimer = GetGameTimer() + 10000
                while GetGameTimer() < endTimer do
                    SetVehicleForwardSpeed(vehicle, GetEntitySpeed(vehicle) + 2.0)
                    Wait(50)
                end
            end)
        end
        
    elseif actionId == "eject" then
        if IsPedInAnyVehicle(playerPed, false) then
            local vehicle = GetVehiclePedIsIn(playerPed, false)
            TaskLeaveVehicle(playerPed, vehicle, 4160) -- Eject at speed
            CreateThread(function()
                Wait(100)
                ApplyForceToEntity(playerPed, 1, 0.0, 0.0, 45.0, 0.0, 0.0, 0.0, false, false, true, true, false, true)
            end)
        end
        
    elseif actionId == "engine_stall" then
        if IsPedInAnyVehicle(playerPed, false) then
            local vehicle = GetVehiclePedIsIn(playerPed, false)
            SetVehicleEngineOn(vehicle, false, true, true)
            SetVehicleUndriveable(vehicle, true)
            CreateThread(function()
                Wait(10000)
                SetVehicleUndriveable(vehicle, false)
                SetVehicleEngineOn(vehicle, true, true, false)
            end)
        end
        
    elseif actionId == "rgb_car" then
        if IsPedInAnyVehicle(playerPed, false) then
            local vehicle = GetVehiclePedIsIn(playerPed, false)
            CreateThread(function()
                local endTimer = GetGameTimer() + 25000
                while GetGameTimer() < endTimer and DoesEntityExist(vehicle) do
                    SetVehicleCustomPrimaryColour(vehicle, math.random(0, 255), math.random(0, 255), math.random(0, 255))
                    SetVehicleCustomSecondaryColour(vehicle, math.random(0, 255), math.random(0, 255), math.random(0, 255))
                    Wait(300)
                end
            end)
        end
        
    -- NPC SPAWNS CATEGORY
    elseif actionId == "sudden_deer" then
        local coords = GetEntityCoords(playerPed)
        local forward = GetEntityForwardVector(playerPed)
        local spawnCoords = coords + (forward * 8.0)
        local model = GetHashKey("a_c_deer")
        
        RequestModel(model)
        CreateThread(function()
            local timeout = 5000
            while not HasModelLoaded(model) and timeout > 0 do Wait(10); timeout = timeout - 10 end
            if not HasModelLoaded(model) then return end
            
            local npc = CreatePed(28, model, spawnCoords.x, spawnCoords.y, spawnCoords.z, GetEntityHeading(playerPed) + 180.0, true, false)
            SetEntityAsMissionEntity(npc, true, true)
            ApplyForceToEntity(npc, 1, forward.x * 20.0, forward.y * 20.0, 0.0, 0.0, 0.0, 0.0, false, false, true, true, false, true)
            
            Wait(15000)
            if DoesEntityExist(npc) then DeleteEntity(npc) end
        end)
        
    elseif actionId == "spawn_bodybuilders" then
        local coords = GetEntityCoords(playerPed)
        local model = GetHashKey("u_m_y_bodybuild_01")
        RequestModel(model)
        
        CreateThread(function()
            local timeout = 5000
            while not HasModelLoaded(model) and timeout > 0 do Wait(10); timeout = timeout - 10 end
            if not HasModelLoaded(model) then return end
            
            local bodybuilders = {}
            for i = 1, 3 do
                local offset = vector3(math.random(-5, 5), math.random(-5, 5), 0.0)
                local npc = CreatePed(26, model, coords.x + offset.x, coords.y + offset.y, coords.z, 0.0, true, false)
                SetPedRelationshipGroupHash(npc, GetHashKey("HATES_PLAYER"))
                GiveWeaponToPed(npc, GetHashKey("WEAPON_BAT"), 1, false, true)
                TaskCombatPed(npc, playerPed, 0, 16)
                table.insert(bodybuilders, npc)
            end
            
            Wait(30000)
            for _, npc in ipairs(bodybuilders) do
                if DoesEntityExist(npc) then DeleteEntity(npc) end
            end
        end)
        
    elseif actionId == "alien_attack" then
        local coords = GetEntityCoords(playerPed)
        local model = GetHashKey("s_m_m_movalien_01")
        RequestModel(model)
        
        CreateThread(function()
            local timeout = 5000
            while not HasModelLoaded(model) and timeout > 0 do Wait(10); timeout = timeout - 10 end
            if not HasModelLoaded(model) then return end
            
            local aliens = {}
            for i = 1, 3 do
                local offset = vector3(math.random(-6, 6), math.random(-6, 6), 0.0)
                local npc = CreatePed(26, model, coords.x + offset.x, coords.y + offset.y, coords.z, 0.0, true, false)
                SetPedRelationshipGroupHash(npc, GetHashKey("HATES_PLAYER"))
                GiveWeaponToPed(npc, GetHashKey("WEAPON_RAYPISTOL"), 100, false, true)
                TaskCombatPed(npc, playerPed, 0, 16)
                table.insert(aliens, npc)
            end
            
            Wait(35000)
            for _, npc in ipairs(aliens) do
                if DoesEntityExist(npc) then DeleteEntity(npc) end
            end
        end)
        
    -- VISUALS & HUD CATEGORY
    elseif actionId == "hide_ui" then
        CreateThread(function()
            local endTimer = GetGameTimer() + 15000
            while GetGameTimer() < endTimer do
                DisplayRadar(false)
                Wait(0)
            end
            DisplayRadar(true)
        end)
        
    elseif actionId == "bw_filter" then
        CreateThread(function()
            SetTimecycleModifier("rhellicopter") -- sets grayscale / staticy filter
            Wait(15000)
            ClearTimecycleModifier()
        end)
        
    elseif actionId == "drunk_aim" then
        CreateThread(function()
            local endTimer = GetGameTimer() + 15000
            while GetGameTimer() < endTimer do
                ShakeGameplayCam("DRUNK_SHAKE", 3.0)
                Wait(1000)
            end
            StopGameplayCamShaking(true)
        end)
        
    -- SOUNDS CATEGORY
    elseif actionId == "sound_horn" then
        if IsPedInAnyVehicle(playerPed, false) then
            local vehicle = GetVehiclePedIsIn(playerPed, false)
            CreateThread(function()
                local endTimer = GetGameTimer() + 8000
                while GetGameTimer() < endTimer do
                    StartVehicleHorn(vehicle, 1000, GetHashKey("HELDDOWN"), false)
                    Wait(1200)
                end
            end)
        end
        
    elseif actionId == "sound_alarm" then
        PlaySoundFromEntity(-1, "Airhorn", playerPed, "DLC_AMSTERDAM_SOUNDS", false, 0)
        
    elseif actionId == "sound_fail" then
        PlaySoundFrontend(-1, "ScreenFlash", "WastedSounds", true)
    end
end)

-- ─── THE BLACK MARKET CLIENT INTEGRATIONS ──────────────────────────────────────

local BlackMarketDealers = {
    [1] = { coords = vector3(1295.104, -1699.532, 54.103), label = "Lester's Warehouse (Murrieta Heights)" },
    [2] = { coords = vector3(284.944, -1772.874, 27.086), label = "Grove Street (Davis)" },
    [3] = { coords = vector3(-1259.311, -824.025, 16.124), label = "Vespucci Canals" },
    [4] = { coords = vector3(1706.812, 3844.84, 33.953), label = "Sandy Shores" },
    [5] = { coords = vector3(-173.864, 6395.597, 30.515), label = "Paleto Bay" }
}

local activeBMBlip = nil
local activeBMPed = nil
local activeBMPickedUp = false

RegisterNUICallback('scanBlackMarket', function(_, cb)
    QBCore.Functions.TriggerCallback('homecomputer:server:scanBlackMarket', function(res)
        cb(res)
    end)
end)

RegisterNUICallback('purchaseBlackMarketWeapon', function(data, cb)
    QBCore.Functions.TriggerCallback('homecomputer:server:purchaseBlackMarketWeapon', function(res)
        cb(res)
    end, data)
end)

RegisterNetEvent('homecomputer:client:setBlackMarketDealer', function(weaponId, dealerIndex)
    local idx = tonumber(dealerIndex) or 1
    local dealer = BlackMarketDealers[idx]
    if not dealer then return end
    
    if activeBMBlip then RemoveBlip(activeBMBlip) end
    if DoesEntityExist(activeBMPed) then DeleteEntity(activeBMPed) end
    
    activeBMPickedUp = false
    
    activeBMBlip = AddBlipForCoord(dealer.coords.x, dealer.coords.y, dealer.coords.z)
    SetBlipSprite(activeBMBlip, 110)
    SetBlipColour(activeBMBlip, 46)
    SetBlipScale(activeBMBlip, 0.9)
    SetBlipAsShortRange(activeBMBlip, false)
    BeginTextCommandSetBlipName("STRING")
    AddTextComponentString("BlackMarket Pickup")
    EndTextCommandSetBlipName(activeBMBlip)
    
    QBCore.Functions.Notify("Secure arms dealer drop marked on your GPS.", "success", 8000)
    
    CreateThread(function()
        local hash = GetHashKey('s_m_y_dealer_01')
        while not activeBMPickedUp do
            local sleep = 1000
            local playerPed = PlayerPedId()
            local pCoords = GetEntityCoords(playerPed)
            local dist = #(pCoords - dealer.coords)
            
            if dist < 100.0 then
                sleep = 500
                if not DoesEntityExist(activeBMPed) then
                    RequestModel(hash)
                    while not HasModelLoaded(hash) do Wait(10) end
                    activeBMPed = CreatePed(4, hash, dealer.coords.x, dealer.coords.y, dealer.coords.z, 0.0, true, false)
                    SetEntityInvincible(activeBMPed, true)
                    FreezeEntityPosition(activeBMPed, true)
                    SetBlockingOfNonTemporaryEvents(activeBMPed, true)
                    GiveWeaponToPed(activeBMPed, GetHashKey('WEAPON_BRIEFCASE'), 1, true, true)
                end
                
                if dist < 5.0 then
                    sleep = 0
                    if dist < 2.0 then
                        DrawText3D(dealer.coords.x, dealer.coords.y, dealer.coords.z + 1.2, "~g~[E]~w~ Retrieve Weapon Cargo")
                        if IsControlJustReleased(0, 38) then
                            activeBMPickedUp = true
                            
                            TaskStartScenarioInPlace(playerPed, "PROP_HUMAN_BUM_BIN", 0, true)
                            Wait(3000)
                            ClearPedTasksImmediately(playerPed)
                            
                            RemoveBlip(activeBMBlip)
                            activeBMBlip = nil
                            DeleteEntity(activeBMPed)
                            activeBMPed = nil
                            
                            TriggerServerEvent('homecomputer:server:claimBlackMarketWeapon', weaponId)
                        end
                    else
                        DrawText3D(dealer.coords.x, dealer.coords.y, dealer.coords.z + 1.2, "Arms Dealer")
                    end
                end
            else
                if DoesEntityExist(activeBMPed) then
                    DeleteEntity(activeBMPed)
                    activeBMPed = nil
                end
            end
            Wait(sleep)
        end
    end)
end)


-- ============================================================================
-- DELIVERY DRIVER LUA GAMEPLAY MODULE
-- ============================================================================

local activeJobVehicle = nil
local activeJobBlip = nil
local activeRoute = nil
local currentStopIndex = 0
local carryingPackage = false
local packagePropObj = nil
local isJobActive = false

local DeliveryLocations = {
    { coords = vector3(149.88, -1007.45, 29.34), label = "Legion Square Apartments" },
    { coords = vector3(-1218.42, -1476.32, 4.35), label = "Vespucci Canals Residence" },
    { coords = vector3(1964.21, 3742.15, 32.22), label = "Sandy Shores House" },
    { coords = vector3(-68.45, 6259.10, 31.08), label = "Paleto Bay Market" },
    { coords = vector3(284.15, -1798.54, 27.02), label = "Strawberry Block 4" },
    { coords = vector3(895.12, -2102.34, 30.52), label = "Cypress Flats Warehouse" },
    { coords = vector3(348.62, 262.15, 105.02), label = "Vinewood Hills Estate" },
    { coords = vector3(-1028.12, -2728.54, 13.82), label = "LS Airport Hangar" },
    { coords = vector3(822.45, -1028.10, 26.48), label = "La Mesa Local Store" },
    { coords = vector3(-818.52, -122.34, 37.45), label = "Rockford Hills Plaza" }
}

local function CleanupDriverJob()
    isJobActive = false
    carryingPackage = false
    currentStopIndex = 0
    activeRoute = nil
    
    if activeJobBlip then
        RemoveBlip(activeJobBlip)
        activeJobBlip = nil
    end
    
    if DoesEntityExist(packagePropObj) then
        DeleteEntity(packagePropObj)
        packagePropObj = nil
    end
    
    if DoesEntityExist(activeJobVehicle) then
        DeleteEntity(activeJobVehicle)
        activeJobVehicle = nil
    end
end

local function SpawnJobVehicle(modelName, coords, heading)
    local model = GetHashKey(modelName)
    RequestModel(model)
    while not HasModelLoaded(model) do
        Wait(10)
    end
    local veh = CreateVehicle(model, coords.x, coords.y, coords.z, heading, true, false)
    SetEntityAsMissionEntity(veh, true, true)
    SetVehicleOnGroundProperly(veh)
    SetModelAsNoLongerNeeded(model)
    return veh
end

local function GetSpawnCoordsNearPlayer()
    local playerPed = PlayerPedId()
    local playerCoords = GetEntityCoords(playerPed)
    local success, spawnCoords, roadHeading = GetClosestVehicleNodeWithHeading(playerCoords.x, playerCoords.y, playerCoords.z)
    if success and #(playerCoords - spawnCoords) < 50.0 then
        return spawnCoords, roadHeading
    else
        local forward = GetEntityForwardVector(playerPed)
        local fallbackCoords = playerCoords + forward * 10.0
        return fallbackCoords, GetEntityHeading(playerPed)
    end
end

local function GetRandomRoute()
    local route = {}
    local temp = {}
    for i, loc in ipairs(DeliveryLocations) do
        table.insert(temp, loc)
    end
    
    for i = 1, 3 do
        if #temp == 0 then break end
        local idx = math.random(#temp)
        table.insert(route, temp[idx])
        table.remove(temp, idx)
    end
    return route
end

local function GrabPackage()
    local ped = PlayerPedId()
    RequestAnimDict("anim@heists@box_carry@")
    while not HasAnimDictLoaded("anim@heists@box_carry@") do
        Wait(10)
    end
    TaskPlayAnim(ped, "anim@heists@box_carry@", "idle", 5.0, -1, -1, 49, 0, false, false, false)
    
    local hash = GetHashKey("hei_prop_heist_box")
    RequestModel(hash)
    while not HasModelLoaded(hash) do
        Wait(10)
    end
    local coords = GetEntityCoords(ped)
    packagePropObj = CreateObject(hash, coords.x, coords.y, coords.z, true, true, true)
    AttachEntityToEntity(packagePropObj, ped, GetPedBoneIndex(ped, 60309), 0.025, 0.08, 0.255, -145.0, 290.0, 0.0, true, true, false, true, 1, true)
    carryingPackage = true
    QBCore.Functions.Notify("Package retrieved from truck! Carry it to the customer front door.", "success")
end

local function DeliverPackage()
    local ped = PlayerPedId()
    ClearPedTasks(ped)
    
    RequestAnimDict("mp_am_hold_up")
    while not HasAnimDictLoaded("mp_am_hold_up") do
        Wait(10)
    end
    TaskPlayAnim(ped, "mp_am_hold_up", "purchase_beerbox", 5.0, -1, -1, 49, 0, false, false, false)
    Wait(1500)
    ClearPedTasksImmediately(ped)
    
    if DoesEntityExist(packagePropObj) then
        DeleteEntity(packagePropObj)
        packagePropObj = nil
    end
    carryingPackage = false
end

local function StartNextStop()
    if not isJobActive or not activeRoute then return end
    
    if currentStopIndex > #activeRoute then
        QBCore.Functions.Notify("All deliveries completed! Return the Benson to finish your shift.", "success", 7000)
        
        local playerPed = PlayerPedId()
        local pCoords = GetEntityCoords(playerPed)
        local success, depotCoords, roadHeading = GetClosestVehicleNodeWithHeading(pCoords.x, pCoords.y, pCoords.z)
        if not success then depotCoords = pCoords end
        
        activeJobBlip = AddBlipForCoord(depotCoords.x, depotCoords.y, depotCoords.z)
        SetBlipSprite(activeJobBlip, 501)
        SetBlipColour(activeJobBlip, 2)
        SetBlipRoute(activeJobBlip, true)
        BeginTextCommandSetBlipName("STRING")
        AddTextComponentString("Return Depot")
        EndTextCommandSetBlipName(activeJobBlip)
        
        CreateThread(function()
            local returned = false
            while isJobActive and not returned do
                local sleep = 500
                local pPos = GetEntityCoords(PlayerPedId())
                local dist = #(pPos - depotCoords)
                
                if dist < 20.0 then
                    sleep = 0
                    DrawMarker(1, depotCoords.x, depotCoords.y, depotCoords.z - 1.0, 0, 0, 0, 0, 0, 0, 3.5, 3.5, 1.0, 0, 255, 0, 150, false, true, 2, false, nil, nil, false)
                    if dist < 4.0 then
                        DrawText3D(depotCoords.x, depotCoords.y, depotCoords.z + 0.8, "~g~[E]~w~ Complete Shift")
                        if IsControlJustReleased(0, 38) then
                            returned = true
                            if IsPedInVehicle(PlayerPedId(), activeJobVehicle, false) then
                                TaskLeaveVehicle(PlayerPedId(), activeJobVehicle, 0)
                                Wait(1500)
                            end
                            CleanupDriverJob()
                            TriggerServerEvent('homecomputer:server:claimDriverPay', 500)
                            QBCore.Functions.Notify("Shift completed! Shift bonus of $500 received.", "success")
                        end
                    end
                end
                Wait(sleep)
            end
        end)
        return
    end
    
    local stop = activeRoute[currentStopIndex]
    activeJobBlip = AddBlipForCoord(stop.coords.x, stop.coords.y, stop.coords.z)
    SetBlipSprite(activeJobBlip, 501)
    SetBlipColour(activeJobBlip, 5)
    SetBlipRoute(activeJobBlip, true)
    BeginTextCommandSetBlipName("STRING")
    AddTextComponentString("Delivery: " .. stop.label)
    EndTextCommandSetBlipName(activeJobBlip)
    
    QBCore.Functions.Notify("GPS updated! Proceed to next delivery: " .. stop.label, "primary", 5000)
    
    CreateThread(function()
        local stopActive = true
        while isJobActive and stopActive do
            local sleep = 500
            local ped = PlayerPedId()
            local pCoords = GetEntityCoords(ped)
            
            if not DoesEntityExist(activeJobVehicle) or GetEntityHealth(activeJobVehicle) <= 0 then
                QBCore.Functions.Notify("Your delivery vehicle was destroyed! Job failed.", "error")
                CleanupDriverJob()
                break
            end
            
            local truckCoords = GetEntityCoords(activeJobVehicle)
            local distToStop = #(truckCoords - stop.coords)
            
            if distToStop < 25.0 then
                sleep = 0
                DrawMarker(1, stop.coords.x, stop.coords.y, stop.coords.z - 1.0, 0, 0, 0, 0, 0, 0, 1.5, 1.5, 1.0, 255, 170, 0, 150, false, true, 2, false, nil, nil, false)
                
                if not carryingPackage then
                    local rearCoords = GetOffsetFromEntityInWorldCoords(activeJobVehicle, 0.0, -4.5, 0.0)
                    local distToRear = #(pCoords - rearCoords)
                    
                    if distToRear < 10.0 then
                        DrawMarker(27, rearCoords.x, rearCoords.y, rearCoords.z - 0.9, 0, 0, 0, 0, 0, 0, 1.0, 1.0, 0.5, 0, 243, 255, 150, false, true, 2, false, nil, nil, false)
                        if distToRear < 2.0 then
                            DrawText3D(rearCoords.x, rearCoords.y, rearCoords.z + 0.5, "~g~[E]~w~ Get Package")
                            if IsControlJustReleased(0, 38) then
                                GrabPackage()
                            end
                        end
                    end
                else
                    local distToDoor = #(pCoords - stop.coords)
                    if distToDoor < 10.0 then
                        if distToDoor < 1.5 then
                            DrawText3D(stop.coords.x, stop.coords.y, stop.coords.z + 0.5, "~g~[E]~w~ Deliver Package")
                            if IsControlJustReleased(0, 38) then
                                DeliverPackage()
                                stopActive = false
                                RemoveBlip(activeJobBlip)
                                activeJobBlip = nil
                                
                                local baseReward = math.random(250, 400)
                                TriggerServerEvent('homecomputer:server:claimDriverPay', baseReward)
                                
                                currentStopIndex = currentStopIndex + 1
                                Wait(2000)
                                StartNextStop()
                            end
                        end
                    end
                end
            end
            Wait(sleep)
        end
    end)
end

-- Scan SP Jobs callback
RegisterNUICallback('scanSPJobs', function(_, cb)
    QBCore.Functions.TriggerCallback('homecomputer:server:scanSPJobs', function(res)
        cb(res)
    end)
end)

-- Start Driver Job callback
RegisterNUICallback('startDriverJob', function(data, cb)
    CloseNUI()
    TriggerEvent('homecomputer:client:startDriverDelivery')
    cb({ status = 'ok' })
end)

-- Register the start driver delivery client event
RegisterNetEvent('homecomputer:client:startDriverDelivery', function()
    CleanupDriverJob()
    
    isJobActive = true
    activeRoute = GetRandomRoute()
    currentStopIndex = 1
    
    local spawnCoords, roadHeading = GetSpawnCoordsNearPlayer()
    activeJobVehicle = SpawnJobVehicle('benson', spawnCoords, roadHeading)
    
    activeJobBlip = AddBlipForEntity(activeJobVehicle)
    SetBlipSprite(activeJobBlip, 85)
    SetBlipColour(activeJobBlip, 5)
    SetBlipRoute(activeJobBlip, true)
    BeginTextCommandSetBlipName("STRING")
    AddTextComponentString("Delivery Benson")
    EndTextCommandSetBlipName(activeJobBlip)
    
    QBCore.Functions.Notify("Delivery job started! Your Benson delivery truck is ready. Get in.", "primary", 6000)
    
    CreateThread(function()
        local entered = false
        while isJobActive and not entered do
            Wait(1000)
            if IsPedInVehicle(PlayerPedId(), activeJobVehicle, false) then
                entered = true
                RemoveBlip(activeJobBlip)
                activeJobBlip = nil
                StartNextStop()
            end
        end
    end)
end)



