#!/usr/bin/env python3

from pkg_resources import resource_filename
from time import time

from sanic import Sanic
from sanic.response import html, json
from jinja2 import Environment, PackageLoader, Markup
from asyncpg import create_pool

from monocle import sanitized as conf
from monocle.bounds import center
from monocle.names import DAMAGE, MOVES, POKEMON
from monocle.web_utils import get_scan_coords, get_worker_markers, Workers, get_args

app = Sanic(__name__)
app.static('/static', resource_filename('monocle', 'static'))


def social_links():
    social_links = ''

    if conf.FB_PAGE_ID:
        social_links = '<a class="map_btn facebook-icon" target="_blank" href="https://www.facebook.com/' + conf.FB_PAGE_ID + '"></a>'
    if conf.TWITTER_SCREEN_NAME:
        social_links += '<a class="map_btn twitter-icon" target="_blank" href="https://www.twitter.com/' + conf.TWITTER_SCREEN_NAME + '"></a>'
    if conf.DISCORD_INVITE_ID:
        social_links += '<a class="map_btn discord-icon" target="_blank" href="https://discord.gg/' + conf.DISCORD_INVITE_ID + '"></a>'
    if conf.TELEGRAM_USERNAME:
        social_links += '<a class="map_btn telegram-icon" target="_blank" href="https://www.telegram.me/' + conf.TELEGRAM_USERNAME + '"></a>'

    return Markup(social_links)

def render_worker_map():
    template = env.get_template('workersmap.html')
    return html(template.render(
        area_name=conf.AREA_NAME,
        map_center=center,
        map_provider_url=conf.MAP_PROVIDER_URL,
        map_provider_attribution=conf.MAP_PROVIDER_ATTRIBUTION,
        social_links=social_links()
    ))


@app.get('/')
async def fullmap(request):
    env = Environment(loader=PackageLoader('monocle', 'templates'))
    username=request.args.get('username', 'Patron')
    css_js = ''

    if conf.LOAD_CUSTOM_CSS_FILE:
        css_js = '<link rel="stylesheet" href="static/css/custom.css">'
    if conf.LOAD_CUSTOM_JS_FILE:
        css_js += '<script type="text/javascript" src="static/js/custom.js"></script>'

    js_vars = Markup(
        "_defaultSettings['FIXED_OPACITY'] = '{:d}'; "
        "_defaultSettings['SHOW_TIMER'] = '{:d}'; "
        "_defaultSettings['RAIDS_FILTER'] = [{}];"
        "_defaultSettings['MAP_FILTER_IDS'] = [{}];"
        "_defaultSettings['TRASH_IDS'] = [{}]; ".format(conf.FIXED_OPACITY, conf.SHOW_TIMER, ', '.join(str(p_id) for p_id in conf.RAIDS_FILTER), ', '.join(str(p_id) for p_id in conf.MAP_FILTER_IDS),  ', '.join(str(p_id) for p_id in conf.TRASH_IDS)))

    template = env.get_template('custom.html' if conf.LOAD_CUSTOM_HTML_FILE else 'newmap.html')
    return html(template.render(
        area_name=conf.AREA_NAME,
        user_name=username,
        map_center=center,
        map_provider_url=conf.MAP_PROVIDER_URL,
        map_provider_attribution=conf.MAP_PROVIDER_ATTRIBUTION,
        social_links=social_links(),
        init_js_vars=js_vars,
        extra_css_js=Markup(css_js)
    ))


if conf.MAP_WORKERS:
    workers = Workers()


    @app.get('/workers_data')
    async def workers_data(request):
        return json(get_worker_markers(workers))


    @app.get('/workers')
    async def workers_map(request, html_map=render_worker_map()):
        return html_map


@app.get('/data')
async def pokemon_data(request, _time=time):
    last_id = request.args.get('last_id', 0)
    async with app.pool.acquire() as conn:
        results = await conn.fetch('''
            SELECT id, pokemon_id, expire_timestamp, lat, lon, form
            FROM sightings
            WHERE expire_timestamp > {} AND id > {}
        '''.format(_time(), last_id))
    return json(list(map(sighting_to_marker, results)))


@app.get('/gym_data')
async def gym_data(request, names=POKEMON, _str=str):
    async with app.pool.acquire() as conn:
        results = await conn.fetch('''
            SELECT
                fs.fort_id,
                fs.id,
                fs.team,
                fs.guard_pokemon_id,
                fs.last_modified,
                fs.in_battle,
                fs.slots_available,
                fs.time_ocuppied,
                f.lat,
                f.lon
            FROM fort_sightings fs
            JOIN forts f ON f.id=fs.fort_id
            WHERE (fs.fort_id, fs.last_modified) IN (
                SELECT fort_id, MAX(last_modified)
                FROM fort_sightings
                GROUP BY fort_id
            )
        ''')
    return json([{
            'id': 'fort-' + _str(fort['fort_id']),
            'sighting_id': fort['id'],
            'pokemon_id': fort['guard_pokemon_id'],
            'pokemon_name': names[fort['guard_pokemon_id']],
            'team': fort['team'],
            'in_battle': fort['in_battle'],
            'slots_available': fort['slots_available'],
            'time_ocuppied': fort['time_ocuppied'],
            'lat': fort['lat'],
            'lon': fort['lon']
    } for fort in results])

@app.get('/raid_data')
async def raid_data(request, names=POKEMON, _str=str, _time=time):
    async with app.pool.acquire() as conn:
        results = await conn.fetch('''
        SELECT
            f.id,
            ri.raid_start,
            ri.raid_end,
            ri.pokemon_id,
            ri.cp,
            ri.move_1,
            ri.move_2,
            ri.raid_level
        FROM forts f
        JOIN raid_info ri ON ri.fort_id = f.id
        WHERE ri.raid_start >= {}
        OR ri.raid_end >= {}
        '''.format(_time(), _time()))
        return json(list(map(raid_to_marker, results)))

@app.get('/spawnpoints')
async def spawn_points(request, _dict=dict):
    async with app.pool.acquire() as conn:
         results = await conn.fetch('SELECT spawn_id, despawn_time, lat, lon, duration FROM spawnpoints')
    return json([_dict(x) for x in results])


@app.get('/pokestops')
async def get_pokestops(request, _dict=dict):
    async with app.pool.acquire() as conn:
        results = await conn.fetch('SELECT external_id, lat, lon FROM pokestops')
    return json([_dict(x) for x in results])


@app.get('/scan_coords')
async def scan_coords(request):
    return json(get_scan_coords())


def sighting_to_marker(pokemon, names=POKEMON, moves=MOVES, damage=DAMAGE, trash=conf.TRASH_IDS, _str=str):
    pokemon_id = pokemon['pokemon_id']
    marker = {
        'id': 'pokemon-' + _str(pokemon['id']),
        'trash': pokemon_id in trash,
        'name': names[pokemon_id],
        'pokemon_id': pokemon_id,
        'lat': pokemon['lat'],
        'lon': pokemon['lon'],
        'expires_at': pokemon['expire_timestamp'],
    }
    if pokemon['form']:
        marker['form'] = chr(pokemon['form']+64)
    return marker

def raid_to_marker(raid, names=POKEMON, moves=MOVES):
    marker = {
        'fort_id': raid['id'],
        'raid_start': raid['raid_start'],
        'raid_end': raid['raid_end'],
        'raid_level': raid['raid_level']
    }
    pokemon_id = raid['pokemon_id']
    if pokemon_id:
        marker['pokemon_id'] = raid['pokemon_id']
        marker['pokemon_name'] = names[raid['pokemon_id']]
        marker['cp'] = raid['cp']
        marker['move_1'] = moves[raid['move_1']]
        marker['move_2'] = moves[raid['move_2']]
    return marker

@app.listener('before_server_start')
async def register_db(app, loop):
    app.pool = await create_pool(**conf.DB, loop=loop)


def main():
    args = get_args()
    app.run(debug=args.debug, host=args.host, port=args.port)


if __name__ == '__main__':
    main()

