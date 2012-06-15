var enToSpotIds = {};

var apiKey = "N6E4NIOVYMTHNDM8J";
var apiHost = "developer.echonest.com";

var sessionId;

var currentArtistID;
var currentArtistName;
var currentSongENID;
var currentTrackSpotifyID;
var currentTrackTitle;

var currentSong;

var activePlaylist;
//AaronD testing
var playedList;

var sp;
var ui;
var models;
var views;
var application;

var player;

function supportsLocalStorage() {
    return ('localStorage' in window) && window['localStorage'] !== null;
}

function initialize() {
	console.log("-=-=- In initialize() ");
	sp = getSpotifyApi(1);
    ui = sp.require("sp://import/scripts/ui");
	models = sp.require('sp://import/scripts/api/models');
    views = sp.require("sp://import/scripts/api/views");
	application = models.application;

	player = models.player;
	
	setUpObserve();
	activePlaylist = new models.Playlist();
	console.log( "activePlaylist now exists; it's " + activePlaylist.length + " long ");

    //AaronD: testing playlist view...
    playedList = new views.List(activePlaylist);
    playedList.node.classList.add("sp-light");
    document.getElementById("played-list").appendChild(playedList.node);

	application.observe(models.EVENT.ARGUMENTSCHANGED, handleArgs);

	if( !localStorage["apiKey"]) {
		localStorage["apiKey"] = apiKey;
	}
	
	if( !localStorage["apiHost"]) {
		localStorage["apiHost"] = apiHost;
	}
	$("#_api_key").val(localStorage["apiKey"]);
	$("#_host").val(localStorage["apiHost"]);

    //Select the Artist field and allow Enter to Submit - quickstart FTW!
    $(document).ready(function() {
        $("#param_form").keydown(function(event) {
            if(event.keyCode == 13){
                makePlaylist();
                return false;
            }
        });
        $("#_artist").select();
    });
}

function updateConfig() {
	apiKey = $("#_api_key").val();
	apiHost = $("#_host").val();

	apiKey = $.trim( apiKey );
	apiHost = $.trim( apiHost );
	// TODO figure out how to trim uuencoded strings
	console.log( "changing apiKey to " + apiKey + " and host to: " + apiHost );
	
	localStorage["apiKey"] = apiKey;
	localStorage["apiHost"] = apiHost;
}

function handleArgs() {
	var args = application.arguments;
	$(".section").hide();	// Hide all sections
	$("#"+args[0]).show();	// Show current section
	console.log(args);

	// If there are multiple arguments, handle them accordingly
	if(args[1]) {		
		switch(args[0]) {
			case "search":
				searchInput(args);
				break;
			case "social":
				socialInput(args[1]);
				break;
		}
	}
}

function setUpObserve() {
	player.observe(models.EVENT.CHANGE, function(event) {
		console.log( "[[[ in observe" );

		if( !player.curPos && !player.track ) {
			console.log( "Maybe this is the right time to get a new track!");
			getNextSong();
		} else {
			console.log( "I'm not yet ready for a new track");
		}
	});
}

function makePlaylist() {
	var artist = $("#_artist").val();
	var songTitle = $("#_song_title").val();
	var artistHot = $("#_artist_hot").val();
	var songHot = $("#_song_hot").val();
	var variety = $("#_variety").val();
	
	if( songTitle ) {
		getSongIDFromTitle( artist, songTitle, artistHot, songHot, variety );
	} else {
		innerGeneratePlaylist( artist, null, artistHot, songHot, variety );
	}
}

function getSongIDFromTitle( artist, songTitle, artistHot, songHot, variety ) {
	var url = "http://" + apiHost + "/api/v4/song/search?api_key=" + apiKey + "&callback=?";

	$.getJSON( url, 
		{
			'artist': artist,
			'title': songTitle,
			'format':'jsonp'
//			'bucket': ['tracks', 'id:spotify-WW'],
//			'limit': true,
		}, function(data) {
				console.log("=== in getSongIDFromTitle; received a response");
				var response = data.response;
				var songs = response.songs;
				var song = songs[0];
				
				if( song ) {
					console.log("=== looking for song: " + songTitle + " and got: " + song.id + " (" + song.title + ")"  );
				
					innerGeneratePlaylist( artist, song.id, artistHot, songHot, variety );
				} else {
					alert("We can't find that song");
				}
			});
}

function displayEnterNew() {
	$("#_enter_seeds").attr("style","display:block;");
	$("#_display_seeds").attr("style","display:none;");	
}

function displayMakePlaylist( artist ) {
	$("#_disp_art_name").text( artist );
	$("#_disp_song_seed").text( "flubber <b> blubber</b>");

	$("#_enter_seeds").attr("style","display:none;");
	$("#_display_seeds").attr("style","display:block;");
}

function innerGeneratePlaylist( artist, songID, artistHot, songHot, variety ) {
	displayMakePlaylist( artist );
	// disable the makePlaylist button
	$("#_play").attr("disabled",true);
	var url = "http://" + apiHost + "/api/v4/playlist/dynamic/create?api_key=" + apiKey + "&callback=?";
	
	clearPlaylist( activePlaylist );

	var parms = {
		"artist": artist,
		"format": "jsonp",
		'bucket': ['tracks', 'id:spotify-WW'],
		"limit": true,
		"artist_min_hotttnesss": artistHot,
		"song_min_hotttnesss": songHot,
		"variety": variety,
		"type": songID ? "song-radio" : "artist-radio"
	};
	if( songID ) {
		parms['song_id'] = songID;
	}
	
	$.getJSON( url, 
		parms,
		function(data) {
			console.log("=== in makePlaylist callback; received a response");
			var response = data.response;
			sessionId = response.session_id;
			$("#_session_id").val(sessionId);
			// update helper link to show session Info
			var siteURL = "http://"+apiHost+"/api/v4/playlist/dynamic/info?api_key=" + apiKey + "&session_id=" + sessionId ;
			$('._en_site').show().children().attr('href', siteURL );
	
			$("a._history_url").attr("href", "http://developer.echonest.com");
			console.log( "got a session; it's " + sessionId );
			getNextSong();
		});
}

function getNextSong() {
	var url = "http://" + apiHost + "/api/v4/playlist/dynamic/next?api_key=" + apiKey + "&callback=?";

	$.getJSON( url, 
		{
			"session_id": sessionId,
			"format": "jsonp"
        },
		function(data) {
			console.log("=== in getNextSong; received a response");
			var response = data.response;
			var songs = response.songs;
			currentSong = songs[0];
			var tracks = currentSong.tracks;

			console.log("=== Looking for song " + currentSong.id + "; title" + currentSong.title + " by artist: " + currentSong.artist_name );
			getSpotifyTracks( currentSong, currentSong.id, tracks );
		});
}


function getSpotifyTracks( song, _soid, _tracks ) {
	findValidTrack( song, _soid, _tracks );
}

function clearPlaylist(playlist) {
	console.log( "About to clear a playlist; currently it is " + playlist.length );
	while (playlist.data.length > 0) {
		playlist.data.remove(0);
	}
}


function actuallyPlayTrack( track, song ) {
	activePlaylist.add( track );

	player.play( track.data.uri, activePlaylist, 0 );
	
	currentArtistID = song.artist_id;
	currentArtistName = song.artist_name;
	currentSongENID = song.id;
	currentTrackSpotifyID = "";
	currentTrackTitle = song.title;

	updateNowPlaying( song.artist_name, song.title, track.data.album.year, track.data.album.name, track.data.album.cover);

	gatherArtistLinks( song.artist_id );
	// reset the rating field
	$("input:radio").removeAttr("checked");

	// re-enable the make new playlist button
	$("#_play").attr("disabled",false);
	
}

function gatherArtistLinks( _artistID ) {
	var url = "http://" + apiHost + "/api/v4/artist/profile?api_key=" + apiKey + "&callback=?";

	$.getJSON( url, 
		{
			"id": _artistID,
			"format": "jsonp",
			'bucket': ['id:twitter', 'id:facebook']
		},
		function(data) {
			console.log("retrieved artist data");
			
			var artist = data.response.artist;
			var forIDs = artist.foreign_ids;

			url = "#";
            var twitelem = $("#trackinfo").find("#_twiturl");
            var fbelem = $("#trackinfo").find("#_fburl");
			twitelem.attr("href", url);
			twitelem.text("None" );
			fbelem.attr("href", url);
			fbelem.text("None" );
			
			if( forIDs ) {
				for( var i = 0; i < forIDs.length; i++ ) {
					var idBlock = forIDs[i];
					console.log("catalog is " + idBlock.catalog + " and foreign_id is " + idBlock.foreign_id);
					if( "twitter" == idBlock.catalog ) {
						url = "http://www.twitter.com/" + idBlock.foreign_id.substring(15);
						twitelem.attr("href", url);
						twitelem.text(idBlock.foreign_id.substring(15));
					}
					if( "facebook" == idBlock.catalog ) {
						url = "http://www.facebook.com/pages/music/" + idBlock.foreign_id.substring(16);
						fbelem.attr("href", url);
						fbelem.text("pages/music/" + idBlock.foreign_id.substring(16));
					}
				}
			}

	});
	
}
function skipTrack() {
	disablePlayerControls();
	console.log("in skipTrack");
	var url = "http://" + apiHost + "/api/v4/playlist/dynamic/feedback?api_key=" + apiKey + "&callback=?";

	$.getJSON( url, 
		{
			"session_id": sessionId,
			"format": "jsonp",
			"skip_song": "last"	// skip the current track
		},
		function(data) {
			console.log("song skipped");
			getNextSong();
		});
}

function banArtist() {
	disablePlayerControls();
	
	console.log("in banArtist");
	var url = "http://" + apiHost + "/api/v4/playlist/dynamic/feedback?api_key=" + apiKey + "&callback=?";

	$.getJSON( url, 
		{
			"session_id": sessionId,
			"format": "jsonp",
			"ban_artist": "last"	// ban the most-recently returned artist
		},
		function(data) {
			console.log("artist banned");
			
			var list = document.getElementById("banned_artists");
            var listitem = document.createElement("li");
            listitem.setAttribute('id', currentArtistID );
            listitem.innerHTML = currentArtistName;
            list.appendChild( listitem );
			
			enablePlayerControls();
		});
}

function favoriteArtist() {
	disablePlayerControls();
	
	console.log("in favoriteArtist");
	var url = "http://" + apiHost + "/api/v4/playlist/dynamic/feedback?api_key=" + apiKey + "&callback=?";

	$.getJSON( url, 
		{
			"session_id": sessionId,
			"format": "jsonp",
			"favorite_artist": "last"	// ban the most-recently returned artist
		},
		function(data) {
			console.log("artist favorited");
			
			var list = document.getElementById("favorite_artists");
            var listitem = document.createElement("li");
            listitem.setAttribute('id', currentArtistID );
            listitem.innerHTML = currentArtistName;
            list.appendChild( listitem );
			
			enablePlayerControls();
		});
}


function banSong() {
	disablePlayerControls();
	
	console.log("in banSong");
	var url = "http://" + apiHost + "/api/v4/playlist/dynamic/feedback?api_key=" + apiKey + "&callback=?";

	$.getJSON( url, 
		{
			"session_id": sessionId,
			"format": "jsonp",
			"ban_song": "last"	// ban the most-recently returned artist
		},
		function(data) {
			console.log("song banned");

			var list = document.getElementById("banned_songs");
            var listitem = document.createElement("li");
            listitem.setAttribute('id', currentSongENID );
            listitem.innerHTML = currentTrackTitle + " by " + currentArtistName;
            list.appendChild( listitem );
			
			enablePlayerControls();
		});
}

function favoriteSong() {
	disablePlayerControls();
	
	console.log("in favoriteSong");
	var url = "http://" + apiHost + "/api/v4/playlist/dynamic/feedback?api_key=" + apiKey + "&callback=?";

	$.getJSON( url, 
		{
			"session_id": sessionId,
			"format": "jsonp",
			"favorite_song": "last"	// ban the most-recently returned artist
		},
		function(data) {
			console.log("song favorited");

			var list = document.getElementById("favorite_songs");
            var listitem = document.createElement("li");
            listitem.setAttribute('id', currentSongENID );
            listitem.innerHTML = currentTrackTitle + " by " + currentArtistName;
            list.appendChild( listitem );

			enablePlayerControls();			
		});
}

// used when a song has to be marked as "not played"
function unplaySong( _song ) {
//	disablePlayerControls();
	
	console.log("in unplaySong for song id " + _song.id );
	var url = "http://" + apiHost + "/api/v4/playlist/dynamic/feedback?api_key=" + apiKey + "&callback=?";

	$.getJSON( url, 
		{
			"session_id": sessionId,
			"format": "jsonp",
			"unplay_song": _song.id	// unplay the most-recently played song
		},
		function(data) {
			console.log("song unplayed for id " + _song.id );
		});
}

function spotifyStar() {
	console.log("in spotifyStar");
	
	player.track.starred = true;
}

function rateSong() {
	disablePlayerControls();
	
	console.log("in rateSong");

	var rating = $('input:radio[name=_rategroup]:checked').val();
	var rateVal = "last^" + rating;
	
	console.log( "sending rateVal" + rateVal );
	var url = "http://" + apiHost + "/api/v4/playlist/dynamic/feedback?api_key=" + apiKey + "&callback=?";

	$.getJSON( url, 
		{
			"session_id": sessionId,
			"format": "jsonp",
			"rate_song": rateVal	// set the rating value
		},
		function(data) {
			console.log("song rated");

			var list = document.getElementById("rated_songs");
            var listitem = document.createElement("li");
            listitem.setAttribute('id', currentSongENID );
            listitem.innerHTML = currentTrackTitle + " by " + currentArtistName + " rated " + rating;
            list.appendChild( listitem );

			enablePlayerControls();
		});

}



function updateNowPlaying( _artist, _title, _year, _album, _cover) {
	console.log( "in updateNowPlaying, artist is " + _artist );
	//var np = $("#nowplaying");
    document.getElementById("np_artist").innerText = "Artist: " + _artist;
    document.getElementById("np_song").innerText = "Song: " + _title;
    document.getElementById("np_year").innerText = "Year: " + ((_year == 0) ? "Unknown" : _year);
    document.getElementById("np_album").innerText = "Album: " + _album;

    var coverImg = new ui.SPImage(_cover);
    coverImg.node.setAttribute("id", "cover_placeholder");
    document.getElementById("np_cover").replaceChild(coverImg.node, document.getElementById("cover_placeholder"));

    //np.find( "#np_artist").text( _artist );
	//np.find( "#np_song").text( _title );
	//np.find( "#np_year").text( _year );
	
	enablePlayerControls();
}

var trackCount = [];
var validTracks = [];

function findValidTrack( song, songID, tracks ) {
	console.log("* in findValidTrack for " + songID + " and I have " + tracks.length + " tracks to check" );
	trackCount[ songID ] = 0;
	
	// set default so we know if none found
	enToSpotIds[ songID ] = null;
	
	for(var i = 0; i < tracks.length; i++ ) {
		trackCount[ songID ]++;
//		console.log( "*** songID = " + songID + "; trackCount is " + trackCount[ songID ] );
		var _trackID = tracks[i].foreign_id.replace("spotify-WW", "spotify");

        //TODO: should t be used?
		var t = models.Track.fromURI( _trackID, function(track) {
//			console.log( "--- in inner function for songID = " + songID + "; trackCount is " + trackCount[ songID ] );

			trackCount[ songID ]--;
//			console.log( "track " + track.uri + "; is playable? " + track.playable + "; album year is " + track.album.year );
			
			if( track.playable) {
				var _uri = track.uri;
				var _year = track.album.year;
				var _title = track.name;
				var _album = track.album.name;
				
				if( validTracks[songID] ) {
					if( validTracks[songID].year > track.album.year) {
						validTracks[songID] = { "id":_uri, "year":_year , "title":_title, "album":_album, "spot_track":track };
						console.log("track: " + track.uri + "is the new best track for song " + songID );
					}
				
				} else {
					validTracks[songID] = { "id":_uri, "year":_year , "title":_title, "album":_album, "spot_track":track };
					console.log("track: " + track.uri + "is the new best track for song " + songID );
				}
				enToSpotIds[ songID ] = validTracks[songID].id;
			}
		} );
	}
	
	// wait for the finish
	waitForTrackCompletion( song, songID );
}

function waitForTrackCompletion( song, songID ) {
	if( trackCount[ songID ] < 1 ) {
		processAllTracksComplete( song, songID );
	} else {
	    setTimeout( function(){ waitForTrackCompletion( song, songID )}, 500 );
    }
}

function processAllTracksComplete( _song, _songID ) {
	console.log( "all tracks have been processed");
	if( validTracks[ _songID ]) {
		var trackID = validTracks[ _songID ].id;
		console.log( "--------------- best track is " + trackID + " for song " + _songID );

		 actuallyPlayTrack( validTracks[ _songID ].spot_track, _song );
	} else {
		console.log( "--------------- No tracks are available and valid for that song; getting the next one...");
		unplaySong( _song );
		getNextSong();
	}
}

function updatePlayerControls( state ) {	
	$("#_skip").attr("disabled",state);
	$("#_banartist").attr("disabled",state);
	$("#_bansong").attr("disabled",state);
	$("#_spotstar").attr("disabled",state);

	$("#_favartist").attr("disabled",state);
	$("#_favsong").attr("disabled",state);
	$("#_ratestar").attr("disabled",state);	
}

function enablePlayerControls() {
	updatePlayerControls( false );
}

function disablePlayerControls() {
	updatePlayerControls( true );
}

