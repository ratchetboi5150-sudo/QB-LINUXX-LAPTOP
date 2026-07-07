fx_version 'cerulean'
game 'gta5'

author 'QBCore Home Computer'
description 'Windows-inspired home computer NUI for home_monitor prop'
version '1.0.0'

shared_scripts {
    '@qb-core/shared/locale.lua',
    'config.lua'
}

client_scripts {
    'client.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server.lua'
}

ui_page 'html/index.html'

exports {
    'CellFrontCamActivate'
}

files {
    'html/index.html',
    'html/style.css',
    'html/enhancements_core.css',
    'html/enhancements_apps.css',
    'html/enhancements_media.css',
    'html/enhancements_trade.css',
    'html/enhancements_ultimate.css',
    'html/minigame.css',
    'html/app.js',
    'html/minigame.js',
    'html/assets/*',
    'html/images/wallpapers/*.png',
    'html/data/News_EN.xml',
    'html/data/Weather_EN.xml',
    'html/data/Temperature_EN.xml',
    'html/data/Alert.png',
    'script.js',
    'module/*.js',
    'module/animation/tracks/*.js',
    'module/animation/*.js',
    'module/audio/*js',
    'module/cameras/*.js',
    'module/core/*.js',
    'module/extras/core/*.js',
    'module/extras/curves/*.js',
    'module/extras/objects/*.js',
    'module/extras/*.js',
    'module/geometries/*.js',
    'module/helpers/*.js',
    'module/lights/*.js',
    'module/loaders/*.js',
    'module/materials/*.js',
    'module/math/interpolants/*.js',
    'module/math/*.js',
    'module/objects/*.js',
    'module/renderers/shaders/*.js',
    'module/renderers/shaders/ShaderChunk/*.js',
    'module/renderers/shaders/ShaderLib/*.js',
    'module/renderers/webgl/*.js',
    'module/renderers/webxr/*.js',
    'module/renderers/webvr/*.js',
    'module/renderers/*.js',
    'module/scenes/*.js',
    'module/textures/*.js'
}

data_file 'DLC_ITYP_REQUEST' 'stream/xs_props.ytyp'

files {
    'stream/home_monitor.ydr',
    'stream/home_monitor.ytd',
    'stream/xs_props.ytyp'
}
