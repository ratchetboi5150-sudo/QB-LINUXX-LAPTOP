Config = {}

-- Item required in inventory to interact with the computer
Config.RequiredItem = 'home_monitor'

-- Props that will trigger the computer interaction
Config.Props = {
    'home_monitor',
}

-- Distance (in units) the player needs to be within to see the prompt
Config.InteractDistance = 1.5

-- Key to open the computer (E = 38)
Config.InteractKey = 38
Config.InteractKeyLabel = 'E'

-- Draw text label
Config.DrawText = '[' .. Config.InteractKeyLabel .. '] Use Computer'

-- Disable player controls while NUI is open
-- Uses control groups: movement, combat, vehicle
Config.DisabledControls = {
    0,   -- Look Left/Right
    1,   -- Look Up/Down
    2,   -- Look Left/Right (mouse)
    24,  -- Attack
    25,  -- Aim
    37,  -- Select Weapon
    58,  -- Radio Wheel
    140, -- Melee Attack
    141, -- Melee Attack2
    142, -- Melee Throw
    257, -- Attack 2
    263, -- Melee Attack Light
    264, -- Melee Attack Heavy
    321, -- Phone
}

-- NUI Focus settings
Config.NuiFocus = true  -- capture cursor
Config.NuiKeepFocus = false -- don't keep game focus

-- Whether to save notes to the database (requires oxmysql)
Config.SaveNotes = true

-- ─── SILK STREET CONFIGURATIONS ──────────────────────────────────────────────

-- Inventory aliases to map catalog items to server database items
Config.SilkAliases = {
    ['joint'] = 'weed_joint',
    ['meth'] = 'meth_baggy',
    ['armor'] = 'heavyarmor'
}

-- Drug buyer spawn points for active drug dealing duty
Config.SilkDeliveryLocations = {
    { coords = vector4(175.0, -900.0, 30.0, 180.0), label = "Legion Square" },
    { coords = vector4(-1200.0, -1450.0, 4.3, 35.0), label = "Vespucci Canals" },
    { coords = vector4(1960.0, 3740.0, 32.2, 300.0), label = "Sandy Shores" },
    { coords = vector4(-70.0, 6260.0, 31.0, 45.0), label = "Paleto Bay" },
    { coords = vector4(285.0, -1800.0, 27.0, 135.0), label = "Strawberry Alley" },
    { coords = vector4(900.0, -2100.0, 30.5, 90.0), label = "Cypress Flats" }
}

-- Darknet Heist Contract parameters
Config.SilkContractLocations = {
    union_vault = {
        label = "Union Depository Raid",
        target = vector3(8.5, -660.0, 32.0),
        propModel = 'prop_gold_box_01',
        enemies = {
            { model = 's_m_m_security_01', offset = vector3(2.0, 2.0, 0.0), weapon = 'weapon_pistol' },
            { model = 's_m_m_security_01', offset = vector3(-2.0, 2.0, 0.0), weapon = 'weapon_smg' },
            { model = 's_m_m_security_01', offset = vector3(2.0, -2.0, 0.0), weapon = 'weapon_pistol' },
            { model = 's_m_m_security_01', offset = vector3(-2.0, -2.0, 0.0), weapon = 'weapon_smg' }
        },
        reward = 25000
    },
    dispensary_raid = {
        label = "Dispensary Robbery",
        target = vector3(375.0, -825.0, 29.3),
        propModel = 'prop_paper_bag_01',
        enemies = {
            { model = 'g_m_y_famdnf_01', offset = vector3(1.5, 1.5, 0.0), weapon = 'weapon_pistol' },
            { model = 'g_m_y_famdnf_01', offset = vector3(-1.5, 1.5, 0.0), weapon = 'weapon_compactrifle' },
            { model = 'g_m_y_famdnf_01', offset = vector3(0.0, -2.0, 0.0), weapon = 'weapon_pistol' }
        },
        reward = 18000
    },
    island_temple = {
        label = "Cayo Temple Intrusion",
        target = vector3(3300.0, -100.0, 1.0),
        propModel = 'prop_box_wood02a',
        enemies = {
            { model = 's_m_y_blackops_01', offset = vector3(3.0, 0.0, 0.0), weapon = 'weapon_carbinerifle' },
            { model = 's_m_y_blackops_01', offset = vector3(-3.0, 0.0, 0.0), weapon = 'weapon_smg' },
            { model = 's_m_y_blackops_01', offset = vector3(0.0, 3.0, 0.0), weapon = 'weapon_pistol' },
            { model = 's_m_y_blackops_01', offset = vector3(0.0, -3.0, 0.0), weapon = 'weapon_carbinerifle' }
        },
        reward = 30000
    },
    beef_slaughterhouse = {
        label = "The Slaughterhouse Deal",
        target = vector3(965.0, -2100.0, 31.0),
        propModel = 'prop_ld_case_01',
        enemies = {
            { model = 'g_m_y_mexgoon_01', offset = vector3(2.0, 1.0, 0.0), weapon = 'weapon_pistol' },
            { model = 'g_m_y_mexgoon_01', offset = vector3(-2.0, 1.0, 0.0), weapon = 'weapon_microsmg' },
            { model = 'g_m_y_mexgoon_01', offset = vector3(0.0, -2.0, 0.0), weapon = 'weapon_pistol' },
            { model = 'g_m_y_mexgoon_01', offset = vector3(1.0, -3.0, 0.0), weapon = 'weapon_compactrifle' }
        },
        reward = 22000
    },
    dealer_ambush = {
        label = "Street Distributor Drop",
        target = vector3(115.0, -1950.0, 20.8),
        propModel = 'prop_security_case_01',
        enemies = {
            { model = 'g_m_y_ballaeast_01', offset = vector3(1.5, 0.0, 0.0), weapon = 'weapon_pistol' },
            { model = 'g_m_y_ballaeast_01', offset = vector3(-1.5, 0.0, 0.0), weapon = 'weapon_smg' },
            { model = 'g_m_y_ballaeast_01', offset = vector3(0.0, -2.0, 0.0), weapon = 'weapon_pistol' }
        },
        reward = 15000
    },
    home_invasion = {
        label = "SP Home Invasion",
        target = vector3(-860.0, 100.0, 50.0),
        propModel = 'prop_crate_07a',
        enemies = {
            { model = 's_m_m_security_01', offset = vector3(2.0, 2.0, 0.0), weapon = 'weapon_pistol' },
            { model = 's_m_m_security_01', offset = vector3(-2.0, 2.0, 0.0), weapon = 'weapon_smg' },
            { model = 's_m_m_security_01', offset = vector3(0.0, -2.0, 0.0), weapon = 'weapon_pistol' }
        },
        reward = 20000
    },
    chaos_gang_war = {
        label = "Chaos Gang War",
        target = vector3(100.0, -1900.0, 20.0),
        propModel = 'prop_weapon_box_01',
        enemies = {
            { model = 'g_m_y_ballasout_01', offset = vector3(2.0, 2.0, 0.0), weapon = 'weapon_smg' },
            { model = 'g_m_y_ballasout_01', offset = vector3(-2.0, 2.0, 0.0), weapon = 'weapon_pistol' },
            { model = 'g_m_y_famca_01', offset = vector3(2.0, -2.0, 0.0), weapon = 'weapon_smg' },
            { model = 'g_m_y_famca_01', offset = vector3(-2.0, -2.0, 0.0), weapon = 'weapon_pistol' }
        },
        reward = 35000
    },
    breaking_v = {
        label = "Breaking V Heist",
        target = vector3(1400.0, 3600.0, 34.0),
        propModel = 'prop_barrel_02a',
        enemies = {
            { model = 'g_m_y_lost_01', offset = vector3(2.0, 1.0, 0.0), weapon = 'weapon_pistol' },
            { model = 'g_m_y_lost_01', offset = vector3(-2.0, 1.0, 0.0), weapon = 'weapon_sawnoff' },
            { model = 'g_m_y_lost_01', offset = vector3(0.0, -2.0, 0.0), weapon = 'weapon_sawnoff' },
            { model = 'g_m_y_lost_01', offset = vector3(1.0, -3.0, 0.0), weapon = 'weapon_pistol' }
        },
        reward = 24000
    },
    faction_warfare = {
        label = "Faction Warfare Outpost",
        target = vector3(1000.0, -2900.0, 5.0),
        propModel = 'prop_mil_crate_01',
        enemies = {
            { model = 's_m_y_blackops_01', offset = vector3(2.0, 2.0, 0.0), weapon = 'weapon_carbinerifle' },
            { model = 's_m_y_blackops_02', offset = vector3(-2.0, 2.0, 0.0), weapon = 'weapon_carbinerifle' },
            { model = 's_m_y_blackops_03', offset = vector3(2.0, -2.0, 0.0), weapon = 'weapon_smg' },
            { model = 's_m_y_blackops_01', offset = vector3(-2.0, -2.0, 0.0), weapon = 'weapon_smg' }
        },
        reward = 28000
    },
    rapper_life = {
        label = "Rapper Luxury Case",
        target = vector3(-1000.0, 80.0, 50.0),
        propModel = 'prop_cash_case_01',
        enemies = {
            { model = 's_m_y_westsec_01', offset = vector3(1.5, 1.5, 0.0), weapon = 'weapon_pistol' },
            { model = 's_m_y_westsec_01', offset = vector3(-1.5, 1.5, 0.0), weapon = 'weapon_pistol' },
            { model = 's_m_y_westsec_01', offset = vector3(0.0, -2.0, 0.0), weapon = 'weapon_pistol' }
        },
        reward = 16000
    },
    reseller_life = {
        label = "Reseller Pawn Robbery",
        target = vector3(-600.0, -250.0, 38.0),
        propModel = 'prop_jewel_box_01',
        enemies = {
            { model = 'g_m_y_pologoon_01', offset = vector3(2.0, 0.0, 0.0), weapon = 'weapon_pistol' },
            { model = 'g_m_y_pologoon_02', offset = vector3(-2.0, 0.0, 0.0), weapon = 'weapon_pistol' },
            { model = 'g_m_y_pologoon_01', offset = vector3(0.0, -2.0, 0.0), weapon = 'weapon_pistol' }
        },
        reward = 20000
    }
}

-- Drop-off points for Heist Contracts
Config.SilkDropoffs = {
    vector3(1200.0, -3200.0, 5.5),   -- Docks
    vector3(1500.0, 3200.0, 35.0),   -- Sandy Airfield Stash
    vector3(-1100.0, 4900.0, 12.0)   -- Paleto Forest Stash
}

