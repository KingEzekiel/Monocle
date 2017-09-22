//intial declarations
var _last_pokemon_id = 0;
var _pokemon_count = 251;
var _WorkerIconUrl = 'https://raw.githubusercontent.com/Avatar690/monocle-icons/master/assets/ball.png';
var _NotificationIconUrl = 'https://raw.githubusercontent.com/Avatar690/monocle-icons/master/assets/ultra.png';
var _PokestopIconUrl = 'https://raw.githubusercontent.com/Avatar690/monocle-icons/master/assets/stop.png';
var _NotificationID = [0]; //This is the default list for notifications
var _raids_count = 5; //default list for raids
var _raids_labels = ['', '', '', '', ''];
var _gyms_count = 4;  //default list for gyms
var _gyms_labels = ['Empty&nbsp', ' Mystic&nbsp', 'Valor&nbsp&nbsp&nbsp', 'Instinct'];
var togglegym = 0;
var toggleraid = 0;
var togglepoke = 0;
var currentLocationMarker;
var currentLocationCircle;
var pokemonInterval;
var nearbyInterval;
//end declarations
//start icons
var PokemonIcon = L.Icon.extend({
    options: {
        popupAnchor: [0, -15]
    },
    createIcon: function() {
        var div = document.createElement('div');
        div.innerHTML =
            '<div class="pokemarker">' +
              '<div class="sprite">' +
                   '<span class="sprite-' + this.options.iconID + '" /></span>' +
              '</div>' +
              //'<div class="poke_iv '+ this.options.rare +'" id="iv'+this.options.ivrange +'">' + this.options.iv.toFixed$
              '<div class="remaining_text" data-expire="' + this.options.expires_at + '">' + calculateRemainingTime(this.options.expires_at) + '</div>' +
            '</div>';
        return div;
    }
});

var PokemonIconIV = L.Icon.extend({
    options: {
        popupAnchor: [0, -15]
    },
    createIcon: function() {
        var div = document.createElement('div');
        div.innerHTML =
            '<div class="pokemarker">' +
              '<div class="sprite">' +
                   '<span class="sprite-' + this.options.iconID + '" /></span>' +
              '</div>' +
              '<div class="remaining_text" data-expire="' + this.options.expires_at + '">' + calculateRemainingTime(this.options.expires_at) + '</div>' +
              '<div class="poke_stats"><span class="poke_iv iv'+this.options.ivrange +'">' + this.options.iv.toFixed(0) +'%</span><span class="poke_level lvl' + this.options.lvlrange +'">| ' + this.options.level +'</span></div>' +
            '</div>';
        return div;
    }
});

var FortIcon = L.Icon.extend({
    options: {
        popupAnchor: [0, -15]
    },
    createIcon: function() {
        var div = document.createElement('div');
        div.innerHTML =
            '<div class="gymmarker fort-icon" id="' + this.options.id + '">' +
            '<img src="' + this.options.iconUrl + '" />' +
            '<div class="gym_slots">' + this.options.slots + '</div>' +
            '</div>';
        return div;
    }
});

var FortIcon_Raid = L.Icon.extend({
    options: {
        popupAnchor: [0, -15]
    },
    createIcon: function() {
        var div = document.createElement('div');
        div.innerHTML =
            '<div class="gymmarker fort-icon" id="' + this.options.id + '">' +
            '<img src="' + this.options.iconUrl + '" />' +
            '<div class="gym_slots">' + this.options.slots + '</div>' +
            '<div class="gym_raid">' + this.options.raid_status + '</div>' +
            '</div>';
        return div;
    }
});

var RaidIcon = L.Icon.extend({
    options: {
        popupAnchor: [0, -15]
    },
    createIcon: function() {
        var div = document.createElement('div');
        div.innerHTML = '<div class="gymmarker fort-icon" id="' + this.options.id + '">' +
                        '<img src="' + this.options.iconUrl + '" />' +
                        '<div class="remaining_raid" width=100% data-expire="' + this.options.raid_end + '">' + calculateRemainingTime(this.options.raid_end) + '</div>' +
                        '<div class="going">x' + this.options.going + '</div>' +
                        '</div>';
        return div;
    }
});

var WorkerIcon = L.Icon.extend({
    options: {
        iconSize: [20, 20],
        className: 'worker-icon',
        iconUrl: _WorkerIconUrl
    }
});

var NotificationIcon = L.Icon.extend({
    options: {
        iconSize: [30, 30],
        className: 'notification-icon',
        iconUrl: _NotificationIconUrl
    }
});

var PokestopIcon = L.Icon.extend({
    options: {
        iconSize: [10, 20],
        className: 'pokestop-icon',
        iconUrl: _PokestopIconUrl
    }
});
//end icons
var markers = {};
var overlays = {
    Pokemon: L.markerClusterGroup({ disableClusteringAtZoom: 12,spiderLegPolylineOptions: { weight: 1.5, color: '#fff', opacity: 0.5 },zoomToBoundsOnClick: false }),
    Gyms: L.layerGroup([]),
    Pokestops: L.layerGroup([]),
    Workers: L.layerGroup([]),
    Spawns: L.layerGroup([]),
    ScanArea: L.layerGroup([])
};

function unsetHidden (event) {
    event.target.hidden = false;
}

function setHidden (event) {
    event.target.hidden = true;
}

function monitor (group, initial) {
    group.hidden = initial;
    group.on('add', unsetHidden);
    group.on('remove', setHidden);
}

monitor(overlays.Pokemon, false)
monitor(overlays.Gyms, true)
//monitor(overlays.Workers, false)

function getPopupContent (item) {
    var diff = (item.expires_at - new Date().getTime() / 1000);
    var minutes = parseInt(diff / 60);
    var seconds = parseInt(diff - (minutes * 60));
    var expires_at = minutes + 'm ' + seconds + 's';
    var content = '<b>' + getPokeName(item.pokemon_id) + ' (' + toGender(item.gender) + ')' + '</b> - <a href="https://pokemongo.gamepress.gg/pokemon/' + item.pokemon_id + '">#' + item.pokemon_id + '</a>';

    //check to see if values are undefined for stats.  If so, just drop basic info
    if (item.pokemon_id == 201){
        content += ' - Form: ' + item.form;
    }
    if (item.cp != undefined){
        var totaliv = 100 * (item.atk + item.def + item.sta) / 45;
        content += ' - <b>' + totaliv.toFixed(2) + '%</b></br>';
        content += 'Disappears in: ' + expires_at + '<br>';
        content += 'Quick Move: ' + item.move1 + '</br>';
        content += 'Charge Move: ' + item.move2 + '<br>';
        content += 'IV: ' + item.atk + '/' + item.def + '/' + item.sta + '<br>';
        content += 'CP: ' + item.cp + ' | Lvl: ' + item.level + '<br>';
    } else {
        content += '<br>Disappears in: ' + expires_at + '<br>';
    }
    content += '<a href="#" data-pokeid="'+item.pokemon_id+'" data-newlayer="trash" class="popup_filter_link">Hide</a>';
    content += '&nbsp; | &nbsp;';

    var userPref = getPreference('notif-'+item.pokemon_id);
    if (userPref == 'rare'){
        content += '<a href="#" data-pokeid="'+item.pokemon_id+'" data-newnotif="common" class="popup_notif_link">Unnotify</a>';
    }else{
        content += '<a href="#" data-pokeid="'+item.pokemon_id+'" data-newnotif="Rare" class="popup_notif_link">Notify</a>';
    }

// delete the marker-not working    content += ' | <a href="#" data-marker="'+item+'" class="delete_marker">Delete</a>';
    content += ' | <a href=https://maps.google.com/maps?q='+ item.lat + ','+ item.lon +' title="Maps" target="_blank">Maps</p></a>';
    return content;
}

function getOpacity (diff) {
    if (diff > 300 || getPreference('FIXED_OPACITY') === "1") {
        return 1;
    }
    return 0.5 + diff / 800;
}
//start markers
function PokemonMarker (raw) {
    var ivrange = 0;
    var lvlrange = 0;
//    var rare = "notrare";
    var totaliv = 100 * (raw.atk + raw.def + raw.sta) / 45;
   /* if ((ivlist.includes(item.pokemon_id) && (item.atk != undefined))){
//    if (ivlist.includes(raw.pokemon_id) && totaliv > 80 || ultralist.includes(raw.pokemon_id)) rare = "israre";*/
    if (raw.cp != undefined) {
    if (totaliv > 99) ivrange = 100;
    else if(totaliv >= 90) ivrange = 90;
    /*else if(totaliv => 80) ivrange = 80;
    else if(totaliv => 70) ivrange = 70;
    else if(totaliv => 60) ivrange = 60;
    else if(totaliv => 50) ivrange = 50;
    else if(totaliv => 40) ivrange = 40;
    else if(totaliv => 30) ivrange = 30;
    else if(totaliv => 20) ivrange = 20;
    else if((totaliv > 0) && (totaliv < 20)) ivrange = 10;*/

    var pokelevel = raw.level;
    if (pokelevel > 29) lvlrange = 30;
    else if(pokelevel >= 25) lvlrange = 25;
    /*else if(pokelevel => 20) lvlrange = 20;
    else if(pokelevel => 10) lvlrange = 10;
    else if(pokelevel => 0) lvlrange = 0;*/

    var icon = new PokemonIconIV({iconID: raw.pokemon_id, ivrange: ivrange, iv: totaliv, level: raw.level, lvlrange: lvlrange, expires_at: raw.expires_at});
    } else {
    var icon = new PokemonIcon({iconID: raw.pokemon_id, expires_at: raw.expires_at});
    }

    var marker = L.marker([raw.lat, raw.lon], {icon: icon, opacity: 1});

    var intId = parseInt(raw.id.split('-')[1]);
    if (_last_pokemon_id < intId){
        _last_pokemon_id = intId;
    }

    if (raw.trash) {
        marker.overlay = 'Trash';
    }
    else {
        marker.overlay = 'Pokemon';
    }
    var userPreference = getPreference('filter-'+raw.pokemon_id);

    if (userPreference === 'pokemon'){
        marker.overlay = 'Pokemon';
    }else if (userPreference === 'trash'){
        marker.overlay = 'Trash';
    }else if (userPreference === 'hidden'){
        marker.overlay = 'Hidden';
    }

    var userPreferenceNotif = getPreference('notif-'+raw.pokemon_id);
	if(localStorage.distance){
		if(userPreferenceNotif === 'rare' && checkCoords(raw.lat,raw.lon)){
			spawnNotification(raw);
		}
	}
	else{
		if(userPreferenceNotif === 'rare'){
			spawnNotification(raw);
		}
    }

    marker.raw = raw;
    markers[raw.id] = marker;
    marker.on('popupopen',function popupopen (event) {
		event.popup.options.autoPan = true; // Pan into view once
        event.popup.setContent(getPopupContent(event.target.raw));
        event.target.popupInterval = setInterval(function () {
            event.popup.setContent(getPopupContent(event.target.raw));
			event.popup.options.autoPan = false; // Don't fight user panning
        }, 5000);
    });
    marker.on('popupclose', function (event) {
        clearInterval(event.target.popupInterval);
    });
    marker.setOpacity(getOpacity(marker.raw));
    marker.opacityInterval = setInterval(function () {
        if (marker.overlay === "Trash" ) {
            return;
        }
        var diff = marker.raw.expires_at - new Date().getTime() / 1000;
        if (diff > 0) {
            marker.setOpacity(getOpacity(diff));
        } else {
            overlays.Pokemon.removeLayer(marker);
            overlays.Pokemon.refreshClusters();
            delete markers[marker.raw.id];
            clearInterval(marker.opacityInterval);
        }
    }, 2500);
    marker.bindPopup();
    return marker;
}

function FortMarker (raw, toggle, raid, going) {
    if (going == undefined) { going = 0; }
    if (raw.in_battle == false)
    {
       in_battle = 0;
    } else {
       in_battle = 1;
    }

    if ((toggle == 0) && (raw.raid != 'N'))  {
       var icon = new FortIcon_Raid({iconUrl: 'https://safarisight.com/monocle-icons/forts/' + raw.team + in_battle + '.png', id: raw.id, raid_status: raw.raid, slots: raw.slots_available});
    } else if ((toggle == 0) && (raw.raid == 'N')) {
       var icon = new FortIcon({iconUrl: 'https://safarisight.com/monocle-icons/forts/' + raw.team + in_battle + '.png', id: raw.id, battle: raw.in_battle, slots: raw.slots_available});
    }
    if (toggle == 1) { var icon = new RaidIcon({iconUrl: 'https://safarisight.com/monocle-icons/forts/blank.png', id: raw.id, raid_end: raid, going: going}); }

    var marker = L.marker([raw.lat, raw.lon], {icon: icon, opacity: 1});
    marker.raw = raw;
    markers[raw.id] = marker;
    var content = ''
    if (raw.team === 0) {
        content = '<b>An empty Gym!</b>'
    } else if (raw.team === 1) {
        content = '<b>Team Mystic</b>'
    } else if (raw.team === 2) {
        content = '<b>Team Valor</b>'
    } else if (raw.team === 3) {
        content = '<b>Team Instinct</b>'
    }
    content += '<br>Slots available: ' + (raw.slots_available || 0) +
        '<br>In battle: ' + (raw.in_battle || false)
        '<br>Guarding Pokemon: ' + getPokeName(raw.pokemon_id) + ' (#' + raw.pokemon_id + ')';
    content += '<br>=&gt; <a href=https://www.google.com/maps/?daddr='+ raw.lat + ','+ raw.lon +' target="_blank" title="See in Google Maps">Get directions</a>';
    marker.default = content;
    marker.bindPopup(content);
    return marker;
}

function WorkerMarker (raw) {
    if (raw.sent_notification === true) {
        var icon = new NotificationIcon();
    } else {
        var icon = new WorkerIcon();
    }
    var marker = L.marker([raw.lat, raw.lon], {icon: icon});
    var circle = L.circle([raw.lat, raw.lon], 70, {weight: 2});
    var group = L.featureGroup([marker, circle])
        .bindPopup('<b>Worker ' + raw.worker_no + '</b><br>time: ' + raw.time + '<br>speed: ' + raw.speed + '<br>total seen: ' + raw.total_seen + '<br>visits: ' + raw.visits + '<br>seen here: ' + raw.seen_here);
    return group;
}
//end markers
//add and parsing functions
function addPokemonToMap (data, map) {
    data.forEach(function (item) {
        // Already placed? No need to do anything, then
        if (item.id in markers) {
            return;
        }
        var marker = PokemonMarker(item);
        if (marker.overlay == "Pokemon")
        {
            overlays.Pokemon.addLayer(marker);
        }
    });
    updateTime();
    if (_updateTimeInterval === null){
        _updateTimeInterval = setInterval(updateTime, 5000);
    }
}

function parseGyms(gym_data, raid_data, gyms)
{

 if (gyms == 0) {
    raidPreference1 = getPreference('raids-'+1);
    raidPreference2 = getPreference('raids-'+2);
    raidPreference3 = getPreference('raids-'+3);
    raidPreference4 = getPreference('raids-'+4);
    raidPreference5 = getPreference('raids-'+5);
    index = 0

     let raid_fort = [];
     let raid_level = [];
     for (var i = 0; i < Object.keys(raid_data).length; i++) {
         if (((raidPreference1 == 'show') && (raid_data[i]['raid_level'] == 1)) || ((raidPreference2 == 'show') && (raid_data[i]['raid_level'] == 2)) || ((raidPreference3 == 'show') && (raid_data[i]['raid_level'] == 3)) || ((raidPreference4 == 'show') && (raid_data[i]['raid_level'] == 4)) || ((raidPreference5 == 'show') && (raid_data[i]['raid_level'] == 5))) {
           raid_fort[index] = 'fort-' + raid_data[i]['fort_id'];
           index++;
         } else {
           raid_data[i] = undefined;
           }
     }

    for (var i = 0; i < Object.keys(gym_data).length; i++) {
       if ($.inArray(gym_data[i]['id'], raid_fort) == -1) {
         gym_data[i] = undefined;
       }
    }
  }

 if (gyms == 1) {
     let currentTime = new Date().getTime() / 1000;
     let raid_fort = [];
     let raid_egg = [];
     let raid_level = [];
     for (var i = 0; i < Object.keys(raid_data).length; i++) {
           if (raid_data[i]['raid_start'] > currentTime) {
              raid_egg[i] = 'fort-' + raid_data[i]['fort_id'];
           } else {
              raid_fort[i] = 'fort-' + raid_data[i]['fort_id'];
           }
     }

    for (var i = 0; i < Object.keys(gym_data).length; i++) {
       if ($.inArray(gym_data[i]['id'], raid_egg) != -1) {
         gym_data[i]['raid'] = 'E';
       } else if ($.inArray(gym_data[i]['id'], raid_fort) != -1) {
         gym_data[i]['raid'] = 'R';
       } else {
         gym_data[i]['raid'] = 'N';
       }
    }
  }

}

function addGymsToMap (data, map, toggle, raid, rsvp) {
   if (toggle == 1) {
    let indices = [];
    let temp_raid = [];
    let index = 0;
    let num_going = Array((Object.keys(data).length)+2).fill(0);

    for (var i = 0; i <= Object.keys(raid).length; i++) {
         if (raid[i] != undefined) {
              temp_raid[index] = 'fort-' + raid[i]['fort_id'];
              indices[index] = i;
              index++;
              }
     }

    for (var i = 0; i <= Object.keys(rsvp).length; i++) {
       if (rsvp[i] != undefined) {
           j = parseInt(rsvp[i]['fort_id']);
           num_going[j] = num_going[j] + 1;
       }
    }

      data.forEach(function (item) {
        if (item != undefined) {
        // No change since last time? Then don't do anything
        var existing = markers[item.id];
        if (typeof existing !== 'undefined') {
            if (existing.raw.sighting_id === item.sighting_id) {
                existing.removeFrom(overlays.Gyms);
            }
            existing.removeFrom(overlays.Gyms);
            markers[item.id] = undefined;
        }

        for (var i = 0; i < indices.length; i++) {
            if (item.id == temp_raid[i]) {
                 marker = FortMarker(item, 1, raid[(indices[i])]['raid_end'], num_going[item.id.substr(5)]);
                 marker.addTo(overlays.Gyms);
           }
        }
      }
    });
  } else {

    emptyPref = getPreference('gyms-'+0);
    mysticPref = getPreference('gyms-'+1);
    valorPref = getPreference('gyms-'+2);
    instinctPref = getPreference('gyms-'+3);

      data.forEach(function (item) {

        if ((item != undefined) && (((item.team == 1) && (mysticPref == 'show')) || ((item.team == 2) && (valorPref == 'show')) || ((item.team == 3) && (instinctPref == 'show')) || ((item.team == 0) && (emptyPref == 'show')))) {
        // No change since last time? Then don't do anything

        var existing = markers[item.id];
        if (typeof existing !== 'undefined') {
            if (existing.raw.sighting_id === item.sighting_id) {
                existing.removeFrom(overlays.Gyms);
            }
            existing.removeFrom(overlays.Gyms);
            markers[item.id] = undefined;
        }
        marker = FortMarker(item, 0, 0, 0);
        marker.addTo(overlays.Gyms);
        }
    });
  }

}

function addRaidsToMap(data, rsvp) {
    let currentTime = new Date().getTime() / 1000;
    data.forEach(function (item) {
        if (item != undefined) {
        let html = '';
        let marker = markers['fort-' + item.fort_id];
	let popup = marker.getPopup();
        let date = null;
        if (marker.raw.team === 0) {
            html += '<b>An empty Gym!</b>';
        }else if (marker.raw.team === 1 ) {
            html += '<b>Team Mystic</b>';
            $('#fort-' + item.fort_id).css('background', '#2196f3');
        }else if (marker.raw.team === 2 ) {
            html += '<b>Team Valor</b>';
            $('#fort-' + item.fort_id).css('background', '#d32f2f');
        }else if (marker.raw.team === 3 ) {
            html += '<b>Team Instinct</b>';
            $('#fort-' + item.fort_id).css('background', '#ffeb3b');
        }
        if (item.raid_start > currentTime) {
            date = new Date(item.raid_start*1000);
            $('#fort-' + item.fort_id + ' > img').attr('src', 'https://safarisight.com/monocle-icons/forts/raid' + item.raid_level + '.png');
            html += `<br>Slots available: ${(marker.raw.slots_available || 0)}
                <br>In battle: ${(marker.raw.in_battle || false)}
                <br>Guarding Pokemon: ${getPokeName(marker.raw.pokemon_id)} (#${marker.raw.pokemon_id})
                <br>Raid level: ${item.raid_level}
                <br>Raid starts in: <span class="raid-timer" data-timer="${item.raid_start}">${calculateRemainingTime(item.raid_start)}</span> (${date.toLocaleTimeString()})<br>`;
            html += buildRsvp(item, rsvp)
            html += `<br>=&gt; <a href="https://www.google.com/maps/?daddr=${marker.raw.lat},${marker.raw.lon}" target="_blank" title="See in Google Maps">Get directions</a>`;

            popup.setContent(html);
            popup.update();

        } else if (item.raid_start < currentTime && item.raid_end > currentTime) {
            date = new Date(item.raid_end*1000);
            if (!item.pokemon_id) {
                html += `<br><b>NO DATA ABOUT RAIDS AVAILABLE</b><br>
                    <b>Raid level:</b> ${item.raid_level}<br>
                    <b>Raid ends in:</b> <span class="raid-timer" data-timer="${item.raid_end}">${calculateRemainingTime(item.raid_end)}</span> (${date.toLocaleTimeString()})<br>`;
            } else {
                $('#fort-' + item.fort_id + ' > img').attr('src', 'https://safarisight.com/monocle-icons/icons/' + item.pokemon_id + '.png')
                html += `<br><b>${getPokeName(item.pokemon_id)}</b> - <a href="https://pokemongo.gamepress.gg/pokemon/'${item.pokemon_id}">#${item.pokemon_id}</a><br>
                        <b>Moveset:</b> ${item.move_1} / ${item.move_2} <br>
                        <b>CP:</b> ${item.cp} <br>
                        <b>Raid level:</b> ${item.raid_level}<br>
                        <b>Raid ends in:</b> <span class="raid-timer" data-timer="${item.raid_end}">${calculateRemainingTime(item.raid_end)}</span> (${date.toLocaleTimeString()})<br>`;
                html += buildRsvp(item, rsvp)
                html +=`<br>=&gt; <a href="https://www.google.com/maps/?daddr=${marker.raw.lat},${marker.raw.lon}" target="_blank" title="See in Google Maps">Get directions</a`;

            }
            popup.setContent(html);
            popup.update();
        }else {
            $('#fort-' + item.fort_id).css('background', '#fff');
            $('#fort-' + item.fort_id + ' > img').attr('src', 'https://safarisight.com/monocle-icons/forts/' + marker.raw.team + marker.raw.slots_available + '.png');
            popup.setContent(marker.default);
            popup.update();
        }
    }
    });
}

function putRsvp (going, expires, fort_id, seed) {
   if (going == 1) {
        $.get('/put_rsvp?going=' + going + '&name=' + _username + '&uid=' + _userid + '&expires=' + expires + '&fort_id=' + fort_id + '&seed=' + seed, function (response) {
            getGyms(1);
        });
   } else {
        $.get('/put_rsvp?going=' + going + '&name=' + _username + '&uid=' + _userid + '&expires=' + expires + '&fort_id=' + fort_id + '&seed=' + seed, function (response) {
            getGyms(1);
        });
   }
}

function buildRsvp(raid, rsvp) {
 let html = "";
 let rsvp_check = "";
 let num_going = 0;
 let going = 1;
 let going_header = "";
 let going_list = "";
 let d = new Date();
 let epoch = Math.round(d.getTime() / 1000);

     for (var i = 0; i < Object.keys(rsvp).length; i++) {
          if (rsvp[i]['expires'] > epoch) {
             if (rsvp[i]['fort_id'] == raid.fort_id) {
                 num_going++;
                 going_list += rsvp[i]['name'] + "<br>";
                 if (rsvp[i]['name'] == _username) {
                    rsvp_check = "checked";
                 }
             }
          }
      }

 if (rsvp_check == "checked") {
     going = 0;
 }

 going_header = "<br><b>Who is going (" + num_going + ")</b><br>";

 html += going_header;
 html += going_list;

 if (going == 1) {
  html += `<input id="${raid.fort_id}checkBox" type="checkbox" ${rsvp_check} onclick="putRsvp(${going}, ${raid.raid_end}, ${raid.fort_id}, ${raid.raid_seed});"><label style="margin-left: 0.5em; vertical-align: middle;" for="checkBox">Let\'s Raid!</label><br>`;
 } else {
  html += `<input id="${raid.fort_id}checkBox" type="checkbox" ${rsvp_check} onclick="putRsvp(${going}, ${raid.raid_end}, ${raid.fort_id}, ${raid.raid_seed});"><label style="margin-left: 0.5em; vertical-align: middle;" for="checkBox">I changed my mind</label><br>`;
 }

 return html;
}

function addSpawnsToMap (data, map) {
    data.forEach(function (item) {
        var circle = L.circle([item.lat, item.lon], 5, {weight: 2});
        var popup = '<b>Spawn ' + item.spawn_id + '</b><br/>time: ';
        var time = '??';
        if (item.despawn_time != null) {
            time = item.despawn_time;
        }
        else {
            circle.setStyle({color: '#f03'})
        }
        popup += time + '<br/>duration: ';
        popup += item.duration == null ? '30mn' : item.duration + 'mn';
        circle.bindPopup(popup);
        circle.addTo(overlays.Spawns);
    });
}

function addPokestopsToMap (data, map) {
    data.forEach(function (item) {
        var icon = new PokestopIcon();
        var marker = L.marker([item.lat, item.lon], {icon: icon});
        marker.raw = item;
        marker.bindPopup('<b>Pokestop ' + item.external_id + '</b>');
        marker.addTo(overlays.Pokestops);
    });
}

function addScanAreaToMap (data, map) {
    data.forEach(function (item) {
        if (item.type === 'scanarea'){
            L.polyline(item.coords).addTo(overlays.ScanArea);
        } else if (item.type === 'scanblacklist'){
            L.polyline(item.coords, {'color':'red'}).addTo(overlays.ScanArea);
        }
    });
}

function addWorkersToMap (data, map) {
    overlays.Workers.clearLayers()
    data.forEach(function (item) {
        marker = WorkerMarker(item);
        marker.addTo(overlays.Workers);
    });
}
//end add functions
//get functions
function getPokemon () {
    if (overlays.Pokemon.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get('/data?last_id='+_last_pokemon_id, function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addPokemonToMap(data, map);
    });
}

function refreshGyms () {
     if (overlays.Gyms.hidden) {
        return;
     }

     if (toggleraid == 1) {
        getGyms(1);
     } else if (togglegym == 1) {
        getGyms(0);
     } else {
        getGyms(0);
        getGyms(1);
     }
}

function getGyms (toggle) {
    if (overlays.Gyms.hidden) {
        return;
    }

    if (toggle != 2){ overlays.Gyms.clearLayers(); }

    let promises = [];

    promises.push(new Promise(function (resolve, reject) {
        $.get('/gym_data', function (response) {
            resolve(response);
        });
    }));
    promises.push(new Promise(function (resolve, reject) {
        $.get('/raid_data', function (response) {
            resolve(response);
        });
    }));
    promises.push(new Promise(function (resolve, reject) {
        $.get('/get_rsvp', function (response) {
            resolve(response);
        });
    }));



    Promise.all(promises).then(function (data) {
        if ((toggle == 1) && (toggleraid == 1)) { parseGyms(data[0], data[1], 0); }
        if ((toggle == 1) && (toggleraid == 1)) {
           addGymsToMap(data[0], map, 1, data[1], data[2])
        } else if (((toggle == 0) && (togglegym == 1)) || ((toggle == 1) && (togglegym == 1))) {
            parseGyms(data[0], data[1], 1);
	    addGymsToMap(data[0], map, 0, data[1]);
        }
        if ((toggle == 1) && (toggleraid == 1)) { addRaidsToMap(data[1], data[2]); }
    });
}

function getSpawnPoints() {
    new Promise(function (resolve, reject) {
        $.get('/spawnpoints', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addSpawnsToMap(data, map);
    });
}

function getPokestops() {
    new Promise(function (resolve, reject) {
        $.get('/pokestops', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addPokestopsToMap(data, map);
    });
}

function getScanAreaCoords() {
    new Promise(function (resolve, reject) {
        $.get('/scan_coords', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addScanAreaToMap(data, map);
    });
}

function getWorkers() {
    if (overlays.Workers.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get('/workers_data', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addWorkersToMap(data, map);
    });
}
//end get functions

//Coords-parsing format is url.com/?lat=1234.56&lon=9.87654&zoom=13
var params = {};
window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
  params[key] = value;
});

var parsezoom = 12.5;
if(parseFloat(params.zoom)) parsezoom = parseFloat(params.zoom);

if(parseFloat(params.lat) && parseFloat(params.lon)){
    var map = new L.Map('main-map', {
        center: [parseFloat(params.lat), parseFloat(params.lon)], 
        zoom: parsezoom,
		maxZoom: 18
    });
}
else{
    var map = L.map('main-map', {preferCanvas: true, maxZoom: 18}).setView(_MapCoords, 12.5);
}
//end coords parsing

overlays.Pokemon.addTo(map);
overlays.Gyms.addTo(map);
//overlays.Spawns.addTo(map);
//overlays.Pokestops.addTo(map);
overlays.ScanArea.addTo(map);
//overlays.Workers.addTo(map);
//uncomment the layers you want to be shown by default
//also uncomment the lines in map.whenready so that they are updated

//Safari checker since safari can only use 5mb of cache
if (L.Browser.safari)
{
	var layer = L.tileLayer(_MapProviderUrl, {
    opacity: 0.80,
	useCache: false,
    attribution: _MapProviderAttribution
	});
}
//if your mapprovider does not support cors disable cache and crossOrigin
//the map will be grey on load if it doesnt support cors/caching
else
{
	var layer = L.tileLayer(_MapProviderUrl, {
		opacity: 0.80,
		useCache: true,
		crossOrigin: true,
		attribution: _MapProviderAttribution
	});
}
layer.addTo(map);
//end map tilepush

//Uncomment lines here to re-add layers
map.whenReady(function () {
//   overlays.Gyms.hidden = true;
    $('.my-location').on('click', function () {
        GetCurrentLocation();
    });

    overlays.Gyms.once('add', function(e) {
        refreshGyms();
    })

    $('.toggle-gym').on('click', function(){
	if (togglegym == 0) {
		overlays.Gyms.hidden = false;
		map.addLayer(overlays.Gyms);
                togglegym = 1;
                toggleraid = 0;
		refreshGyms();
		} else {
			overlays.Gyms.hidden = true;
			map.removeLayer(overlays.Gyms);
			togglegym = 0;
			}
	});

    $('.no-poke').on('click', function(){
        if (togglepoke == 1) {
                overlays.Pokemon.hidden = false;
                map.addLayer(overlays.Pokemon);
                setInterval(getPokemon(), 30500);
                togglepoke = 0;
                } else {
                        overlays.Pokemon.hidden = true;
                        map.removeLayer(overlays.Pokemon);
                        togglepoke = 1;
                        }
        });

    $('.toggle-raid').on('click', function(){
        if (toggleraid == 0) {
                overlays.Gyms.hidden = false;
                map.addLayer(overlays.Gyms);
                toggleraid = 1;
                togglegym = 0;
                refreshGyms();
                } else {
                        overlays.Gyms.hidden = true;
                        map.removeLayer(overlays.Gyms);
                        toggleraid = 0;
                        }
        });

/*    overlays.Spawns.once('add', function(e) {
        getSpawnPoints();
    })
    overlays.Pokestops.once('add', function(e) {
        getPokestops();
    })

    getWorkers();*/

    overlays.Workers.hidden = true;
    getPokemon();
    refreshGyms();
    overlays.Gyms.hidden = true;

    setInterval(getPokemon, 30500);
    setInterval(refreshGyms, 300000);
    //setInterval(getWorkers, 14000);

    currentLocationMarker = L.marker([map.getCenter().lat, map.getCenter().lng]).addTo(map);

    map.on('locationfound', function(event){
        if (typeof currentLocationMarker !== 'undefined') {
            currentLocationMarker.remove();
        }

        if (typeof currentLocationCircle !== 'undefined') {
            currentLocationCircle.remove();
        }

        map.setZoom(13);

        var lat = event.latitude; //map.getCenter().lat;
        var lng = event.longitude; //map.getCenter().lng;

        currentLocationMarker = L.marker([lat, lng]).addTo(map);
        getPokemon();
        getScanAreaCoords();
        pokemonInterval = setInterval(getPokemon, 30500);
/*
        currentLocationCircle = L.circle([lat, lng], {
            color: 'green',
            fillColor: 'green',
            fillOpacity: 0.1,
            radius: 1500
        }).addTo(map);
  */

    });

    map.on('moveend', function (e) {
        _last_pokemon_id = 0;
		getScanAreaCoords();
    });

    GetCurrentLocation();
});

$('.my-lists').on('click', function () {
    ShowLists();
});

$("#lists>ul.nav>li>a").on('click', function(){
    // Click handler for each tab button.
    $(this).parent().parent().children("li").removeClass('active');
    $(this).parent().addClass('active');
    var panel = $(this).data('panel');
    var item = $("#lists>.settings-panel").removeClass('active')
        .filter("[data-panel='"+panel+"']").addClass('active');
});

$("#lists_close_btn").on('click', function(){
    // 'X' button on Settings panel

    clearInterval(nearbyInterval);

    $("#lists").animate({
        opacity: 0
    }, 250, function(){ $(this).hide(); });
});

$("#settings>ul.nav>li>a").on('click', function(){
    // Click handler for each tab button.
    $(this).parent().parent().children("li").removeClass('active');
    $(this).parent().addClass('active');
    var panel = $(this).data('panel');
    var item = $("#settings>.settings-panel").removeClass('active')
        .filter("[data-panel='"+panel+"']").addClass('active');
});

$("#settings_close_btn").on('click', function(){
    // 'X' button on Settings panel
    $("#settings").animate({
        opacity: 0
    }, 250, function(){ $(this).hide(); });
});

$('.my-settings').on('click', function () {
    // Settings button on bottom-left corner
    $("#settings").show().animate({
        opacity: 1
    }, 250);
});

$('#reset_btn').on('click', function () {
    // Reset button in Settings>More
    if (confirm("This will reset all your preferences. Are you sure?")){
        localStorage.clear();
        location.reload();
    }
});

$('body').on('click', '.popup_filter_link', function () {
    var oldlayer;
    var id = $(this).data("pokeid");
    var layer = $(this).data("newlayer").toLowerCase();
    moveToLayer(id, layer);
    setPreference("filter-"+id, layer);
    if(layer === "pokemon") oldlayer = "trash";
    else oldlayer = "pokemon"
    var item = $("#settings button[data-id='"+id+"']");
    item.filter("[data-value='"+oldlayer+"']").removeClass("active");
    setPreference("filter-"+id, layer);
    item.filter("[data-value='"+layer+"']").addClass("active");
});

$('body').on('click', '.popup_notif_link', function () {
    var oldnotif ;
    var id = $(this).data("pokeid");
    var notif = $(this).data("newnotif").toLowerCase();
    if(notif === "rare") oldnotif = "common";
    else oldnotif = "rare"
    setPreference("notif-"+id, notif);
    var item = $("#settings button[data-id='"+id+"']");
    item.filter("[data-value='"+oldnotif+"']").removeClass("active");
    item.filter("[data-value='"+notif+"']").addClass("active");
});

$('body').on('click', '.delete_marker', function () {
    var marker = $(this).data("marker");
    overlays.Pokemon.removeLayer(marker);
    overlays.Pokemon.refreshClusters();
    delete markers[marker.id];
    clearInterval(marker.opacityInterval);
});

$('#settings').on('click', '.settings-panel button', function () {
    //Handler for each button in every settings-panel.
    var item = $(this);
    if (item.hasClass('active')){
        return;
    }
	if (item.hasClass('savebutton')){
		return;
	}
    var id = item.data('id');
    var key = item.parent().data('group');
    var value = item.data('value');

    item.parent().children("button").removeClass("active");
    item.addClass("active");

    if ((typeof currentLocationMarker !== 'undefined') & (key.indexOf('filter-') > -1)){
        // This is a pokemon's filter button
        moveToLayer(id, value);
		setPreference(key, value);
    }else{
        setPreference(key, value);
    }

});

//end button handlers
function moveToLayer(id, layer){
    //setPreference("filter-"+id, layer);
    layer = layer.toLowerCase();
    for(var k in markers) {
        var m = markers[k];
        if ((k.indexOf("pokemon-") > -1) && (m !== undefined) && (m.raw.pokemon_id === id)){
            overlays.Pokemon.removeLayer(m);
            if (layer === 'pokemon'){
                m.overlay = "Pokemon";
                overlays.Pokemon.addLayer(m);
            }else if (layer === 'trash') {
                m.overlay = "Trash";
            }
        }
    }
}

function populateSettingsPanels(){
    var container = $('.settings-panel[data-panel="filters"]').children('.panel-body');
    var newHtml = '';
    for (var i = 1; i <= _pokemon_count; i++){
            if ($.inArray(i, _defaultSettings['MAP_FILTER_IDS']) == -1) {
            var partHtml = `<div class="text-center">
                <div id="menu" class="sprite"><span class="sprite-`+i+`"></span></div>
                <div class="btn-group" role="group" data-group="filter-`+i+`">
                  <button type="button" class="btn btn-default" data-id="`+i+`" data-value="pokemon">Show</button>
                  <button type="button" class="btn btn-default" data-id="`+i+`" data-value="trash">Hide</button>
                </div>
            </div>
        `;

        newHtml += partHtml
        }
	}
    newHtml += '</div>';
    container.html(newHtml);

    containerraids = $('.settings-panel[data-panel="raids"]').children('.panel-body');
    newHtmlraids = '<tr>';
    for (var i = 1; i <= _raids_count; i++){
        var partHtmlraids = `<td><div class="text-center">
                <span class="raid-label"><img src="https://safarisight.com/monocle-icons/forts/raid` + i + `.png" height=40 width=40 align="left"></span>
                <div class="btn-group" role="group" data-group="raids-`+i+`">
                  <button type="button" onclick="getGyms(1)" class="btn btn-default" data-id="`+i+`" data-value="show">Show</button>
                  <button type="button" onclick="getGyms(1)" class="btn btn-default" data-id="`+i+`" data-value="hide">&nbspHide&nbsp</button>
                </div>
            </div></td>
        `;

        newHtmlraids += partHtmlraids
    }
    newHtmlraids += '</div></tr><tr>';

    for (var i = 0; i < _gyms_count; i++){
        var partHtmlraids = `<td><div class="text-center">
                <span class="gym-label"><img src="https://safarisight.com/monocle-icons/forts/` + i + `.png" align="left"></span>
                <div class="btn-group" role="group" data-group="gyms-`+i+`">
                  <button type="button" onclick="getGyms(0)" class="btn btn-default" data-id="`+i+`" data-value="show">Show</button>
                  <button type="button" onclick="getGyms(0)" class="btn btn-default" data-id="`+i+`" data-value="hide">&nbspHide&nbsp</button>
                </div>
            </div></td>
        `;

         newHtmlraids += partHtmlraids
    }
    newHtmlraids += '</div></tr>';
    containerraids.html(newHtmlraids);

    var containernotif = $('.settings-panel[data-panel="notif"]').children('.panel-body');
    var newHtmlnotif = '';
    for (var i = 1; i <= _pokemon_count; i++){
            if ($.inArray(i, _defaultSettings['MAP_FILTER_IDS']) == -1) {
		    var partHtmlnotif = `<div class="text-center">
                <div id="menu" class="sprite"><span class="sprite-`+i+`"></span></div>
                <div class="btn-group" role="group" data-group="notif-`+i+`">
                  <button type="button" id="notifbutton" class="btn btn-default" data-id="`+i+`" data-value="rare">On</button>
                  <button type="button" id="notifbutton" class="btn btn-default" data-id="`+i+`" data-value="common">Off</button>
                </div>
            </div>
        `;

        newHtmlnotif += partHtmlnotif
		}
    }
    newHtmlnotif += '</div>';
    containernotif.html(newHtmlnotif);

	//Distance notifications
	if(localStorage.lat && localStorage.lon && localStorage.distance){
		$( "#lat" ).val(localStorage.lat);
		$( "#lon" ).val(localStorage.lon);
		$( "#distance" ).val(localStorage.distance);
		$( "#saved" ).val('Radius active, clear the coordinates to disable');
    }
}

function setSettingsDefaults(){
    for (var i = 1; i <= _pokemon_count; i++){
        _defaultSettings['filter-'+i] = (_defaultSettings['TRASH_IDS'].indexOf(i) > -1) ? "trash" : "pokemon";
    };

	for (var i = 1; i <= _raids_count; i++){
        _defaultSettings['raids-'+i] = (_defaultSettings['RAIDS_FILTER'].indexOf(i) > -1) ? "show" : "hide";
    };

        for (var i = 0; i <= _gyms_count; i++){
        _defaultSettings['gyms-'+i] = (_defaultSettings['GYM_FILTER'].indexOf(i) > -1) ? "show" : "hide";
    };


    $("#settings div.btn-group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
    });

    for (var i = 1; i <= _pokemon_count; i++){
        _defaultSettings['notif-'+i] = (_NotificationID.indexOf(i) > -1) ? "rare" : "common";
    };

    $("#settings div.btn-group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
    });

    for (var i = 1; i <= _pokemon_count; i++){
        _defaultSettings['notif-'+i] = (_NotificationID.indexOf(i) > -1) ? "rare" : "common";
    };

    $("#settings div.btn-group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
    });
}

function getPreference(key, ret){
    return localStorage.getItem(key) ? localStorage.getItem(key) : (key in _defaultSettings ? _defaultSettings[key] : ret);
}

function setPreference(key, val){
    localStorage.setItem(key, val);
}

$(window).scroll(function () {
    if ($(this).scrollTop() > 100) {
        $('.scroll-up').fadeIn();
    } else {
        $('.scroll-up').fadeOut();
    }
});

$("#settings").scroll(function () {
    if ($(this).scrollTop() > 100) {
        $('.scroll-up').fadeIn();
    } else {
        $('.scroll-up').fadeOut();
    }
});

$('.scroll-up').click(function () {
    $("html, body, #settings").animate({
        scrollTop: 0
    }, 500);
    return false;
});

function calculateRemainingTime(expire_at_timestamp) {
    var diff = (expire_at_timestamp - new Date().getTime() / 1000);
    if (diff < 0) {
        return '00:00:00';
    }
    var minutes = parseInt(diff / 60);
    var seconds = parseInt(diff - (minutes * 60));
    return minutes + ':' + (seconds > 9 ? "" + seconds: "0" + seconds);
}

function updateTime() {
    if (getPreference("SHOW_TIMER") === "1"){
        $(".remaining_text").each(function() {
            $(this).css('visibility', 'visible');
            $(this).css('height', '15px');
            this.innerHTML = calculateRemainingTime($(this).data('expire'));
        });
    }else{
        $(".remaining_text").each(function() {
            $(this).css('visibility', 'hidden');
        });
    }
    $('.raid-timer').each(function (){
        let time = $(this).data('timer');
        $(this).text(calculateRemainingTime(time));
    });

    if (getPreference("SHOW_TIMER") === "1"){        $(".remaining_raid").each(function() {            $(this).css('visibility', 'visible');            $(this).css('height', '15px');            this.innerHTML = calculateRemainingTime($(this).data('expire'));        });    }else{        $(".remaining_raid").each(function() {            $(this).css('visibility', 'hidden');        });                                                                                                                                            } 



}

function time(s) {
    return new Date(s * 1e3).toISOString().slice(-13, -5);
}

//Notifications on Desktop
var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (!isMobile) {
    Notification.requestPermission();
}

var audio = new Audio('/static/ding.mp3');
function spawnNotification(raw) {
   if (!isMobile) {
   var theIcon = 'https://safarisight.com/monocle-icons/icons/' + raw.pokemon_id + '.png';
   var theTitle = getPokeName(raw.pokemon_id) + ' has spawned!';
   if (raw.atk != undefined) {
	var theBody = raw.atk+'/'+raw.def+'/'+raw.sta +' and Expires at ' + time(raw.expires_at);
	} else {
	   var theBody = 'Expires at ' + time(raw.expires_at);
	}

  var options = {
    body: theBody,
    icon: theIcon,
  }
	var n = new Notification(theTitle, options);
	n.onclick = function(event) {
		event.preventDefault();
		window.focus();
		map.panTo(new L.LatLng(raw.lat, raw.lon));
		n.close();
	}
	var userPreferenceNotif = getPreference('NOTIF_SOUND');
	if(userPreferenceNotif === "1"){
			audio.play();
		}

	  }
		setTimeout(n.close.bind(n), 600000);

}
//end desktop notifications
//Distance notifications
var coord;
function saveCoords() {

	if(parseFloat(document.getElementById('lat').value) && parseFloat(document.getElementById('lon').value) ) {
	   localStorage.lat = parseFloat(document.getElementById('lat').value); 
	   localStorage.lon = parseFloat(document.getElementById('lon').value); 
	   localStorage.distance = parseFloat(document.getElementById('distance').value); 
		$( "#saved" ).text('Radius active, clear the coordinates to disable');
	}
	else{
		alert('Enter a valid lat,lon and distance');
	}

}

function checkCoords(lat, lon) {
	var coordinates = new L.LatLng(lat,lon);

	if(localStorage.lat && localStorage.lon) {
		coord = [localStorage.lat, localStorage.lon];

	}
	if(typeof coord !== 'undefined' && localStorage.distance){
		if(coordinates.distanceTo(coord) < localStorage.distance) return true;
		//console.log(coordinates.distanceTo(coord));

	}
	else return false;
}

var circle;
var circleon = false;
function showCircle() {
	if (circleon){
		overlays.Pokemon.removeLayer(circle);
		circleon = false;

		$("#settings").animate({
		opacity: 0
		}, 250, function(){ $(this).hide(); });
	}
	else{

		if(localStorage.lat && localStorage.lon && localStorage.distance){
			lat = localStorage.lat;
			lon = localStorage.lon;
			distance = localStorage.distance;

			circle = L.circle([lat, lon], {radius: distance});
			overlays.Pokemon.addLayer(circle);
			circleon = true;

			$("#settings").animate({
			opacity: 0
			}, 250, function(){ $(this).hide(); });
		}
		else{
		saveCoords();
		}
	}

}

function removeCoords() {
	localStorage.removeItem('lat');
	localStorage.removeItem('lon');
	localStorage.removeItem('distance');
	$( "#lat" ).val('');
	$( "#lon" ).val('');
	$( "#distance" ).val('');
	$( "#saved" ).text('Enter lat, long and distance to activate');
}

map.on("contextmenu", function (event) {
  var clickcoord = event.latlng.toString();
  $( "#saved" ).text(clickcoord);
});
//end distance notifications
//begin nearby panel
function GetCurrentLocation() {
    map.locate({ enableHighAccurracy: true, setView: true });
}

function ShowLists() {
    populateNearbyList();

    // List button on bottom-left corner
    $("#lists").show().animate({
        opacity: 1
    }, 250);

    nearbyInterval = setInterval(function() {
        populateNearbyList();
    }, 5000);
}

function populateNearbyList(){
    var pokemon = [];

    var container = $('.settings-panel[data-panel="lists"]').children('.panel-body');
    var newHtml = '';

    for(var k in markers) {
        var m = markers[k];
        if ((k.indexOf("pokemon-") > -1) && (m !== undefined) && (m.overlay !== "Hidden")){
            var userPreference = getPreference('filter-'+m.raw.pokemon_id);
            if (userPreference === 'pokemon'){
                var pokeLat = m._latlng.lat;
                var pokeLng = m._latlng.lng;

                //var dy = Math.abs(currentLocationMarker._latlng.lat - pokeLat);
                //var dx = Math.abs(currentLocationMarker._latlng.lng - pokeLng);

                // Get distance
                var distance = Number((CalcDistanceKm(pokeLat, pokeLng, currentLocationMarker._latlng.lat, currentLocationMarker._latlng.lng) * 0.62137).toFixed(2)); //dx + dy;
                m.distance = distance;

                // Sort pokemon by distance
                PushSort(pokemon, m);
            }  
        }
    }

    if (pokemon.length > 0) {
        for(var k in pokemon) {
            var m = pokemon[k];

            var distance = m.distance;

            var pokemon_id = m.raw.pokemon_id;

            var diff = (m.raw.expires_at - new Date().getTime() / 1000);
            var minutes = parseInt(diff / 60);
            var seconds = parseInt(diff - (minutes * 60));
            var expires_at = minutes + 'm ' + seconds + 's';

            if ((minutes > 0) || (seconds > 0)) {
                var partHtml = `<div class="text-center nearby" data-value="` + m.raw.id + `">
                        <img style="float:left" data-value="` + m.raw.id + `" src="https://safarisight.com/monocle-icons/icons/` + pokemon_id + `.png">
                        <div class="text-center" data-value="` + m.raw.id + `">
                        <b>` + getPokeName(m.raw.pokemon_id) + `</b><br/>
                        <b>Distance:</b> ` + distance + ` miles<br/>
                        Disappears in: ` + expires_at + `<br/>
                        </div>
                    </div><br>
                `;

                newHtml += partHtml;
            }
        }
    }
    else {
        newHtml = '<div class="text-center">Nothing Nearby</div>';
    }

    //newHtml += '</div>';
    container.html(newHtml);

    $('.nearby').on('click', function(e){
        // Get pokemon location
        var m = markers[e.target.getAttribute('data-value')];
        var lat = m.raw.lat;
        var lng = m.raw.lon;

        // Set view to pokemon location
        map.setView(new L.LatLng(lat, lng),14);

        m.openPopup();

        clearInterval(nearbyInterval);

        // Hide lists panel
        $("#lists").animate({
            opacity: 0
        }, 250, function(){ $(this).hide(); });
    });
}

function PushSort(arr, item)
{
    var added = false;

    if (arr.length > 0) {
        for(var k in arr) {
            var m = arr[k];

            if ((m !== undefined) && (m.distance !== undefined)) {
                if (item.distance < m.distance) {
                    arr.splice(k, 0, item);
                    added = true;
                    break;
                }
            }
        }
    }

    if (!added) {
        arr.push(item);
    }
}

function CalcDistanceKm(lat1, lon1, lat2, lon2) {
  var p = 0.017453292519943295;    // Math.PI / 180
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;

  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

function getPokeName(dnum) {
    //calling getPokeName(25); returns 'Pikachu'
    dex=['Pokemon','Bulbasaur','Ivysaur','Venusaur','Charmander','Charmeleon','Charizard','Squirtle','Wartortle','Blastoise','Caterpie','Metapod','Butterfree','Weedle','Kakuna','Beedrill','Pidgey','Pidgeotto','Pidgeot','Rattata','Raticate','Spearow','Fearow','Ekans','Arbok','Pikachu','Raichu','Sandshrew','Sandslash','Nidoran?','Nidorina','Nidoqueen','Nidoran?','Nidorino','Nidoking','Clefairy','Clefable','Vulpix','Ninetales','Jigglypuff','Wigglytuff','Zubat','Golbat','Oddish','Gloom','Vileplume','Paras','Parasect','Venonat','Venomoth','Diglett','Dugtrio','Meowth','Persian','Psyduck','Golduck','Mankey','Primeape','Growlithe','Arcanine','Poliwag','Poliwhirl','Poliwrath','Abra','Kadabra','Alakazam','Machop','Machoke','Machamp','Bellsprout','Weepinbell','Victreebel','Tentacool','Tentacruel','Geodude','Graveler','Golem','Ponyta','Rapidash','Slowpoke','Slowbro','Magnemite','Magneton','Farfetch&lsquo;d','Doduo','Dodrio','Seel','Dewgong','Grimer','Muk','Shellder','Cloyster','Gastly','Haunter','Gengar','Onix','Drowzee','Hypno','Krabby','Kingler','Voltorb','Electrode','Exeggcute','Exeggutor','Cubone','Marowak','Hitmonlee','Hitmonchan','Lickitung','Koffing','Weezing','Rhyhorn','Rhydon','Chansey','Tangela','Kangaskhan','Horsea','Seadra','Goldeen','Seaking','Staryu','Starmie','Mr. Mime','Scyther','Jynx','Electabuzz','Magmar','Pinsir','Tauros','Magikarp','Gyarados','Lapras','Ditto','Eevee','Vaporeon','Jolteon','Flareon','Porygon','Omanyte','Omastar','Kabuto','Kabutops','Aerodactyl','Snorlax','Articuno','Zapdos','Moltres','Dratini','Dragonair','Dragonite','Mewtwo','Mew','Chikorita','Bayleef','Meganium','Cyndaquil','Quilava','Typhlosion','Totodile','Croconaw','Feraligatr','Sentret','Furret','Hoothoot','Noctowl','Ledyba','Ledian','Spinarak','Ariados','Crobat','Chinchou','Lanturn','Pichu','Cleffa','Igglybuff','Togepi','Togetic','Natu','Xatu','Mareep','Flaaffy','Ampharos','Bellossom','Marill','Azumarill','Sudowoodo','Politoed','Hoppip','Skiploom','Jumpluff','Aipom','Sunkern','Sunflora','Yanma','Wooper','Quagsire','Espeon','Umbreon','Murkrow','Slowking','Misdreavus','Unown','Wobbuffet','Girafarig','Pineco','Forretress','Dunsparce','Gligar','Steelix','Snubbull','Granbull','Qwilfish','Scizor','Shuckle','Heracross','Sneasel','Teddiursa','Ursaring','Slugma','Magcargo','Swinub','Piloswine','Corsola','Remoraid','Octillery','Delibird','Mantine','Skarmory','Houndour','Houndoom','Kingdra','Phanpy','Donphan','Porygon2','Stantler','Smeargle','Tyrogue','Hitmontop','Smoochum','Elekid','Magby','Miltank','Blissey','Raikou','Entei','Suicune','Larvitar','Pupitar','Tyranitar','Lugia','Ho-Oh']
    return dex[dnum];
}

function toGender(num) {
    switch(num) {
         case 0:
             gender = '?';
             break;
         case 1:
             gender = 'M';
             break;
         case 2:
             gender = 'F';
             break;
         case 3:
             gender = 'N'
             break
    }
    return gender;
}

//Populate settings and defaults
populateSettingsPanels();
setSettingsDefaults();
