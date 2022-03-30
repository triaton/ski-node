
$(function () {
    var FADETIMOUT      = 2000;

    // running events
    var events = [];
    var curEvent = 0;

    var players = [];

    var view_all_start_list = false;

    var sync_time = 0;

    // info of current event
    var startlist = []; // startlist
    var horses = {};    // indexed map
    var riders = {};    // indexed map
    var startlistmap = {};  // number indexed map
    var rankings = [];  // ranking list
    var realtime = {};  // live info


    var rolling_timer;
    var timer_running = false;

    var eventInfo = {}; // event.info

    // Prompt for setting a username
    var connected = false;
    var socket = io();

    socket.emit("subscribe", "consumer");
//

    //// messages to process
    //   socket.to('consumer').emit('start', { id: event.id} );
    //   socket.to('consumer').emit('end', { id: socket.eventId });
    //   socket.to(event.id).emit('info', event.info);
    //   socket.to(event.id).emit('horses', event.horses);
    //   socket.to(event.id).emit('riders', event.riders);
    //   socket.to(event.id).emit('startlist', event.startlist);
    //   socket.to(event.id).emit('ranking', event.ranking);
    //   socket.to(event.id).emit('ready', event.realtime);
    //   socket.to(event.id).emit('resume');
    //   socket.to(event.id).emit('realtime', event.realtime);
    //   socket.to(event.id).emit('pause');
    //   socket.to(event.id).emit('final', event.realtime);

    // Socket events

    // get the current running events information
    socket.on("events", function(data) {
        console.log("[on] events:" + JSON.stringify(data));
        events = data;
        updateEventList();
    });

    // add new event started
    socket.on("start", function (data) {
        console.log("[on] start:" + JSON.stringify(data));
        events.push(data);
        updateEventList();
    });

    // an event is ended
    socket.on("end", function (data) {
        console.log("[on] end:" + JSON.stringify(data));

        // stop timer
        clearInterval(rolling_timer);
        timer_running = false;
        setRuntimeList(true);

        events = events.filter((event) => {
            return event.id !== data;
        });

        $('#error_finishevent').show();

        updateEventList();
    });

    // update event info
    socket.on("info", function (data) {
        console.log("[on] info:" + JSON.stringify(data));

        // set eventInfo
        eventInfo = data;

        // update UI
        $('#meeting-title').text(data.title);
        $('#event-title').text(data.eventTitle);

        $('#event-date').text(formatDate(data.event_date));

        addInterList();

        sync_time = 0;

        rolling_timer = setInterval(function() {
            /*
            if(Date.now() - tickFrom > 2000) {
                tickFrom = realtime.updateTick;
                if(realtime.lane === 1) {
                    started = realtime.score.lane1.time;
                } else {
                    started = realtime.score.lane2.time;
                }
                console.log('timer synced: tickFrom=' + tickFrom + ", started=" + started);
            }
            updateRuntimeTimer(realtime.lane, started + (Date.now() - tickFrom));
            */
            if (sync_time != 0) {
                sync_time += 100;
                updateCurrentTime(sync_time);
            }

        }, 100);

        // update headercolumns according to the race type
        //updateTableHeaderColumns();
    });

    // update rider info
    socket.on('players', function (data) {
        console.log("[on] players:" + data.length/* + JSON.stringify(data) */);

        var old_players = JSON.parse(JSON.stringify(players));

        players = {};
        for (let key in data) {
            players[key.toString()] = data[key];
        }

        for (let key in players) {
            let new_player = players[key];
            let old_player = old_players[key];

            if (new_player == undefined || 
                old_player == undefined ||
                old_player.running_section >= eventInfo.inter_number + 1 ||
                old_player.running_section == 0) 
            {
                continue;   
            }

            if (new_player.running_section != old_player.running_section) {
                new_player.delete_inter = old_player.running_section;
                console.log("delete_inter=", old_player.running_section, new_player.num);
            }
        }

        // update UI
        //updateLiveRankingList();
        //updateRankingList();
        //updateStartList();

        updateStartList();

        updateCurrentList();

        updateRankList();

        updateFinishList();

        updateInterList();

        
    });

    // update sync
    socket.on('sync', function (data) {

        //console.log("sync", data);

        sync_time = parseInt(data);

        updateCurrentTime(data);

    });

    function updateCurrentTime(sync_time) {

        //for (let inter = 1; inter <= eventInfo.inter_number + 1; inter ++)
        {


            var idx = 1;
    
            for (let key in players)
            {
                let player = players[key];   
                
                // var tableId = "live-realtime";

                // if (player.running_section < eventInfo.inter_number + 1)
                // {
                //     tableId = "live-inter" + player.running_section;
                // } 
    
                //if (player.running_section == eventInfo.inter_number + 1) 
                if (player.running_section > 0 && player.running_section <= eventInfo.inter_number + 1) 
                {    
                    player.real_time = parseInt(sync_time) - parseInt(player.sections[0].start_time);
    
                    //var tr = $('#' + tableId + ' tr:nth-child(' + idx + ')');
                    //tr.children("td:nth-child(7)").html(tickToTimeD(player.real_time));
                    if (!$("#running-time-" + player.num).parent().hasClass('delete-inter'))
                        $("#running-time-" + player.num).html(tickToTimeD(player.real_time));    
                    //idx ++;
                } 
            }    
        }
    }

    function updateStartList() {

        var tableId = 'live-atstart';
        clearRanking(tableId);

        let index = 1;
        for (let key in players) {

            var player = players[key];
            if (player.running_section == 0) {
                //console.log("start", player.num, player.reg_start_time);
                //addToList(tableId, index ++, player, 0);
            }
        }

        let ranking = JSON.parse(JSON.stringify(Object.values(players)));

        // resort by ranking
        ranking.sort((a, b) => {
            return a.reg_start_time - b.reg_start_time;
        });




        let ranking1 = [];
        index = 1;
        for (let i = 0; i < ranking.length; i ++) {

            var player = ranking[i];
            if (player.running_section == 0) {
                
                ranking1.push(player);

                if (view_all_start_list == false) {
                    if (index > 10)
                    break;
                }

                index ++;
                //addToList(tableId, index ++, player, 0);
            }
        }

        ranking1.sort((a, b) => {
            return b.reg_start_time - a.reg_start_time;
        });

        index = 1;
        for (let i = 0; i < ranking1.length; i ++) {

            var player = ranking1[i];
                
            addToList(tableId, index ++, player, 0);
        }

    }

    function addInterList() {

        $('#inter-body').html("");

        for (let i = 1; i <= eventInfo.inter_number; i ++) {

            $('#inter-body').append($('#sec-inter').html());

            //tr.children("td:nth-child(1)").html(player.num);

            $('#inter-body').children("div:nth-child(" + i +")").find(".subtitle h3").html("inter" + i);
            $('#inter-body').children("div:nth-child(" + i +")").find("table tbody").attr("id", "live-inter" + i);
        }
    }
    
    function updateCurrentList() {

        let tableId = 'live-realtime';
        clearRanking(tableId);

        let ranking = [];

        let index = 1;
        for (let key in players) {

            var player = players[key];

            if (player.running_section == eventInfo.inter_number + 1 && player.finish_time == undefined) 
            {
                ranking.push(player);
                //addToList(tableId, index ++, player, eventInfo.inter_number + 1);
            }
        }

        ranking = ranking.reverse();

        for(let key in ranking) {
            var player = ranking[key];
            addToList(tableId, key + 1, player, eventInfo.inter_number + 1);
        }
    }

    function updateInterList() {

        for (let inter = 1; inter <= eventInfo.inter_number; inter ++)
        {
            let tableId = 'live-inter' + inter;
            //clearRanking(tableId);

            let olds = {};

            $('#' + tableId).children('tr').each(function () {
                var tr = $(this);    
                var num = parseInt(tr.children("td:nth-child(1)").text());
                olds[num] = 0;
            });
    
            let ranking = [];

            let index = 1;
            for (let key in players) {
    
                var player = players[key];
    
                if (player.running_section == inter) 
                {
                    olds[player.num] = 1;
                    ranking.push(player);
                    //addToInterList(tableId, index ++, player);
                }
            }   

            ranking = ranking.reverse();

            for (let key in ranking) {
                var player = ranking[key];
                addToInterList(tableId, (key + 1), player);
            }
            
            for (let key in olds) {
                old = olds[key];

                if (old == 0) {
                    var player = players[key];
                    var tr = $("#inter-" + (player.running_section - 1) + "-" + player.num);
                    //tr.children("td:nth-child(2)").html("");
                    tr.find("td").css("background", 'blue');
                    tr.addClass("delete-inter");
                    setInterval(function(){
                        tr.remove();
                    }, 5000);
                    
                }
            }
        }
    }

    function updateFinishList() {

        let tableId = 'live-atfinish';
        clearRanking(tableId);



        let ranking = JSON.parse(JSON.stringify(Object.values(players)));

        // resort by ranking
        ranking.sort((a, b) => {
            return b.finish_time - a.finish_time;
        });

        index = 1;
        for (let i = 0; i < ranking.length; i ++) {
            

            var player = ranking[i];
            if (player.finish_time != undefined) 
            {
                if ( index > 3)
                    break;

                addToFinishList(tableId, index ++, player);
            }
        }
    }

    function updateRankList() {

        let tableId = 'live-ranking';
        clearRanking(tableId);

        let index = 1;
        
        for (let key in players) {

            var player = players[key];

            if (player.finish_time != undefined) 
            {
                let elapsed_time = 0;
                for (let i = 0; i <= eventInfo.inter_number + 1; i ++) {
                    if (player.sections[i] && player.sections[i].elapsed_time) {
                        elapsed_time = parseInt(player.sections[i].elapsed_time);
                    }
                }
                player.elapsed_time = elapsed_time;
                //addToRankList(tableId, index ++, player);
            }
        }

        let ranking = JSON.parse(JSON.stringify(Object.values(players)));

        // resort by ranking
        ranking.sort((a, b) => {
            return a.elapsed_time - b.elapsed_time;
        });

        let first_elapsed_time = 0;
        index = 1;
        for (let i = 0; i < ranking.length; i ++) {

            var player = ranking[i];
            if (player.finish_time != undefined) 
            {
                var p = players[player.num];
                p.rank = index;
                //player.rank = index;
                if (first_elapsed_time == 0) {
                    p.gap = 0;
                    first_elapsed_time = p.elapsed_time;
                } else {
                    p.gap = p.elapsed_time - first_elapsed_time;
                }

                addToRankList(tableId, index ++, p);
            }
        }
        
    }

    // type 0: start, 1: current, 2: finish, 3: ranking
    function addToList(tableId, i, player, type) {

        var tr = $('#' + tableId + ' tr:nth-child(' + i + ')');

        if (tr.length == 0) 
        {
            $('#' + tableId).append($('<tr>'));
            tr = $('#' + tableId + ' tr:last');
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-3 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 center").html("&nbsp"));
            if (type == 0)
                tr.append($('<td>').addClass("col-2 center").html("&nbsp"));
            else
                tr.append($('<td id="running-time-' + player.num + '">').addClass("col-2 center").html("&nbsp"));
        }

        tr.children("td:nth-child(1)").html(player.num);
        tr.children("td:nth-child(2)").html(player.lastname + "&nbsp;" + player.firstname);
        tr.children("td:nth-child(3)").html(player.gender + "&nbsp;"); //
        tr.children("td:nth-child(4)").html(player.year);
        tr.children("td:nth-child(5)").html(player.club + "&nbsp;");
        //tr.children("td:nth-child(6)").html("&nbsp;");
        if (player.nation != "") {
            tr.children("td:nth-child(6)").html(player.nation);
            tr.children("td:nth-child(6)").css("background", "#232323 url('flags/" + player.nation + ".bmp') right no-repeat").css("background-size", "contain");
        }
        
        if (type == 0) { //start list
            //tr.children("td:nth-child(3)").html(tickToTime(player.sections[type].start_time));
            tr.children("td:nth-child(7)").html(tickToTime(player.reg_start_time));
        } else if (type == eventInfo.inter_number + 1) { // current list
            tr.children("td:nth-child(7)").html(tickToTime(player.current_time));
        }
    }

    function addToInterList(tableId, i, player) {

        //var tr = $('#' + tableId + ' tr:nth-child(' + i + ')');
        var tr = $("#inter-" + player.running_section + "-" + player.num);

        if (tr.length == 0) 
        {
            //$('#' + tableId).append($('<tr id="' + "inter-"+ player.running_section + '-' + player.num + '">'));
            $('<tr id="' + "inter-"+ player.running_section + '-' + player.num + '">').prependTo('#' + tableId);
            //$('#' + tableId).append($('<tr>'));
            tr = $('#' + tableId + ' tr:first');
            //if (player.delete_inter)
            //    tr.addClass("delete-inter");
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-3 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 center").html("&nbsp"));
            tr.append($('<td id="running-time-' + player.num + '">').addClass("col-2 center").html("&nbsp"));
        }

        tr.children("td:nth-child(1)").html(player.num);
        tr.children("td:nth-child(2)").html(player.lastname + "&nbsp;" + player.firstname);
        tr.children("td:nth-child(3)").html(player.gender + "&nbsp;"); //
        tr.children("td:nth-child(4)").html(player.year);
        tr.children("td:nth-child(5)").html(player.club + "&nbsp;");
        //tr.children("td:nth-child(6)").html("&nbsp;");
        if (player.nation != "") {
            tr.children("td:nth-child(6)").html(player.nation);
            tr.children("td:nth-child(6)").css("background", "#232323 url('flags/" + player.nation + ".bmp') right no-repeat").css("background-size", "contain");
        }
        
        //tr.children("td:nth-child(7)").html(tickToTime(player.current_time));

    }

    function clearRanking(tableId) {
        $('#' + tableId).html("");
        //let length = $('#' + tableId).children('tr').length;
        /*
        $('#' + tableId).children('tr').each(function () {
            var tr = $(this);

            var num = parseInt(tr.children("td:nth-child(1)").text());
            if (players[num].delete_inter == true) {
                players[num].delete_inter = false;
                tr.addClass("deleting-inter");
                tr.css("background", "#777 !important");
                //tr.hide();
                //setInterval(function(){
                //    tr.remove();
                //}, 5000);
            } else if (!tr.hasClass("deleting-inter")) {
                //tr.remove();
            }
        });
        */
    }

    function addToFinishList(tableId, i, player) {

        var tr = $('#' + tableId + ' tr:nth-child(' + i + ')');

        if (tr.length == 0) 
        {
            $('#' + tableId).append($('<tr>'));
            tr = $('#' + tableId + ' tr:last');
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
        }

        tr.children("td:nth-child(1)").html(player.num);
        tr.children("td:nth-child(2)").html(player.lastname + "&nbsp;" + player.firstname);
        tr.children("td:nth-child(3)").html(player.gender + "&nbsp;"); //
        tr.children("td:nth-child(4)").html(player.year);
        tr.children("td:nth-child(5)").html(player.club + "&nbsp;");
        tr.children("td:nth-child(5)").addClass("small-font");

        tr.children("td:nth-child(6)").html("&nbsp;");
        if (player.nation != "") {
            tr.children("td:nth-child(6)").html(player.nation);
            tr.children("td:nth-child(6)").css("background", "#232323 url('flags/" + player.nation + ".bmp') right no-repeat").css("background-size", "contain");
        }

        tr.children("td:nth-child(7)").html(tickToTimeD(player.elapsed_time));
        tr.children("td:nth-child(8)").html(tickToTimeD(player.gap));
        tr.children("td:nth-child(9)").html(player.rank); //Rank
        
        
    }

    function addToRankList(tableId, i, player) {

        var tr = $('#' + tableId + ' tr:nth-child(' + i + ')');

        if (tr.length == 0) 
        {
            $('#' + tableId).append($('<tr>'));
            tr = $('#' + tableId + ' tr:last');
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-1 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 center").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 center").html("&nbsp"));
        }

        tr.children("td:nth-child(1)").html(i);
        tr.children("td:nth-child(2)").html(player.num);
        tr.children("td:nth-child(3)").html(player.lastname + "&nbsp;" + player.firstname);
        tr.children("td:nth-child(4)").html(player.gender + "&nbsp;"); // 
        tr.children("td:nth-child(5)").html(player.year);
        tr.children("td:nth-child(6)").addClass("small-font");
        tr.children("td:nth-child(6)").html(player.club + "&nbsp;");
        tr.children("td:nth-child(8)").html(tickToTimeD(player.elapsed_time));
        tr.children("td:nth-child(9)").html(tickToTimeD(player.gap));
        
        
        tr.children("td:nth-child(7)").html("&nbsp;");
        if (player.nation != "") {
            tr.children("td:nth-child(7)").html(player.nation);
            tr.children("td:nth-child(7)").css("background", "#232323 url('flags/" + player.nation + ".bmp') right no-repeat").css("background-size", "contain");
        }
        
    }

    //  fill the list from index to the atstart list
    function updateLiveAtStart(index) {
        clearRanking("live-atstart");

        let limit = (index + 3 < players.length)?(index + 3):players.length;

        var row = 1;
        // load ranking data
        for(i = limit - 1 ; i >= index ; i--) {
            players[i].rank = i + 1; // it is pos value
            addToRankingList("live-atstart", row++, players[i]);
        }
        // clearRankingRemains("live-atstart", row);
    }

    // fill the rank from index to the atstart list
    function updateLiveAtFinish(index) {
        clearRanking("live-atfinish");

        let limit = (index - 3 >= 0)?(index - 3):-1;

        var row = 1;

        // load ranking data
        for(let i = index ; i > limit ; i--) {
            let num = startlist[i].num;

            let ranking = rankings.find(function(ranking) {
                return ranking.num === num;
            });

            if(ranking === undefined) {
                // add empty ranking
                ranking = { num: num, score: { lane1: {}, lane2: {} }};
            }
            addToRankingList("live-atfinish", row++, ranking);
        }
        // clearRankingRemains("live-atfinish", row);
    }

        
    // one ready to race
    socket.on('ready', function(data) {
        console.log("[on] ready:");
        // find position
        let startlistentry = startlistmap[realtime.num];

        // update atstart and atend
        if(startlistentry !== undefined) {
            updateLiveAtStart(startlistentry['pos'] + 1);
            updateLiveAtFinish(startlistentry['pos'] - 1);
        }

        // init realtime and update
        setRuntimeList(true);
    });

    // get live race info
    socket.on('realtime', function (data) {
        console.log("[on] realtime:" + JSON.stringify(data));
        realtime = data;

        realtime.updateTick = Date.now();
        // update except time
        setRuntimeList(false);

        if(timer_running == false) {
            let curTime;
            if(realtime.lane === 1) {
                curTime = realtime.score.lane1.time;
            } else {
                curTime = realtime.score.lane2.time;
            }
            updateRuntimeTimer(realtime.lane, curTime);
        }
    });

    // racing is started (every round)
    socket.on('resume', function (data) {
        console.log("[on] resume");

        // find position
        let startlistentry = startlistmap[realtime.num];

        // update atstart and atend
        if(startlistentry !== undefined) {
            updateLiveAtStart(startlistentry['pos'] + 1);
            updateLiveAtFinish(startlistentry['pos'] - 1);
        }

        // start rolling timer
        if(timer_running) {
            console.log("timer already running");
        } else {
            let started = 0, tickFrom = Date.now();
            if(realtime.lane === 1) {
                started = realtime.score.lane1.time;
            } else {
                started = realtime.score.lane2.time;
            }

            rolling_timer = setInterval(function() {
                if(Date.now() - tickFrom > 2000) {
                    tickFrom = realtime.updateTick;
                    if(realtime.lane === 1) {
                        started = realtime.score.lane1.time;
                    } else {
                        started = realtime.score.lane2.time;
                    }
                    console.log('timer synced: tickFrom=' + tickFrom + ", started=" + started);
                }
                updateRuntimeTimer(realtime.lane, started + (Date.now() - tickFrom));
            }, 100);
            timer_running = true;
        }
    });

    // racing is paused (every round)
    socket.on('pause', function (data) {
        console.log("[on] pause");

        // stop rolling timer
        clearInterval(rolling_timer);
        timer_running = false;

        // full update
        if(data.finished === true) {
            setRuntimeList(true);
        } else {
            let started;
            if(realtime.lane === 1) {
                started = realtime.score.lane1.time;
            } else {
                started = realtime.score.lane2.time;
            }
            updateRuntimeTimer(realtime.lane, started);
        }
    });

    // one player finished
    socket.on('final', function (data) {
        console.log("[on] final:" + JSON.stringify(data));

        // find position
        let startlistentry = startlistmap[realtime.num];

        // update atstart and atend
        if(startlistentry !== undefined) {
            updateLiveAtStart(startlistentry['pos'] + 1);
            updateLiveAtFinish(startlistentry['pos']);
        }

        // update runtime with ranking
        let ranking = rankings.find(function(ranking) {
            return ranking.num === realtime.num;
        });
        if(ranking !== undefined) {
            realtime.rank = ranking.rank;
        }
        setRuntimeList(true);
    });

    socket.on('disconnect', function () {
        console.log('you have been disconnected');
    });

    socket.on('reconnect', function () {
        console.log('you have been reconnected');
        events = [];

        socket.emit("subscribe", "consumer");
    });

    socket.on('reconnect_error', function () {
        console.log('attempt to reconnect has failed');
    });


    ///////////////////////////////////////////////////
    // UI management function

    function formatFloat(point, digit, round) {
        digit = (digit > 5)?5:digit;
        digit = (digit < 0)?0:digit;

        let pos = Math.pow(10, digit);
        if(round==='round') {
            point = Math.round(point * pos);
        } else if(round ==='ceil') {
            point = Math.ceil(point * pos);
        } else if(round==='floor') {
            point = Math.floor(point * pos);
        }
        return (point / pos).toFixed(digit);
    }

    function formatPoint(score, detail) {
        if(score.point === undefined)
            return "&nbsp";

        let labels = ["Classified", "Not Present", "Not Started", "Retired", "Eliminated", "Off-course", "Disqualified"];
        if(score.point === undefined)
            return "&nbsp";

        if(score.point < 0) {
            let index = Math.abs(score.point) - 1;
            if(index > 0 && index <= 6) {
                return labels[index];
            }
        }

        let label = formatFloat(score.point / 1000, 2, 'floor');
        if(detail && (score.pointPenalty !== undefined && score.pointPenalty != 0)) {
            label += "(+" + formatFloat(score.pointPenalty / 1000, 2, 'floor') + ")";
        }
        return label;
    }

    function formatTime(score, detail) {
        if(score.time === undefined)
            return "&nbsp";

        let label = formatFloat(Math.abs(score.time) / 1000, 2, 'floor');
        if(detail && (score.timePenalty !== undefined && score.timePenalty != 0)) {
            label += "(+" + formatFloat(Math.abs(score.timePenalty) / 1000, 2, 'floor') + ")";
        }
        return label;
    }

    function formatDate(dateString) {
        //var d = new Date(dateString);
        //return ("0" + d.getDate()).slice(-2) + "." + ("0"+(d.getMonth()+1)).slice(-2) + "." + d.getFullYear();

        var date = new Date("1900/1/1 12:00 AM");
        date.setDate(date.getDate() + parseInt(dateString) - 2);
        
        return date.getDate()  + "." + (date.getMonth()+1) + "." + date.getFullYear();
    }

    function updateTableHeaderColumns() {
        // change header
        let headers = $(".table-scoreboard thead tr");

         if(eventInfo.jumpoffNumber > 0) {
             headers.children("th:nth-child(6)").removeClass("col-2").addClass("col-1").addClass("small-font");
             headers.children("th:nth-child(7)").removeClass("col-2").addClass("col-1").addClass("small-font");
             headers.children("th:nth-child(8)").removeClass("col-2").addClass("col-1").css("display", "inline-block").addClass("small-font");
             headers.children("th:nth-child(9)").removeClass("col-2").addClass("col-1").css("display", "inline-block").addClass("small-font");
         } else {
             headers.children("th:nth-child(6)").removeClass("col-1").addClass("col-2").removeClass("small-font");
             headers.children("th:nth-child(7)").removeClass("col-1").addClass("col-2").removeClass("small-font");
             headers.children("th:nth-child(8)").css("display", "none").removeClass("small-font");
             headers.children("th:nth-child(9)").css("display", "none").removeClass("small-font");
         }

        // realtime
        var tr = $('#live-realtime tr:first');

        if(eventInfo.jumpoffNumber > 0) {
            tr.children("td:nth-child(6)").removeClass("col-2").addClass("col-1");
            tr.children("td:nth-child(7)").removeClass("col-2").addClass("col-1");
            tr.children("td:nth-child(8)").removeClass("col-2").addClass("col-1").css("display", "inline-block");
            tr.children("td:nth-child(9)").removeClass("col-2").addClass("col-1").css("display", "inline-block");
        } else {
            tr.children("td:nth-child(6)").removeClass("col-1").addClass("col-2");
            tr.children("td:nth-child(7)").removeClass("col-1").addClass("col-2");
            tr.children("td:nth-child(8)").css("display", "none");
            tr.children("td:nth-child(9)").css("display", "none");
        }
    }


    function tickToTime(ticks)
    {
        if (ticks == undefined || ticks == "")
            return "&nbsp;";

        var ts = ticks / 1000;

        //conversion based on seconds
        var hh = Math.floor( ts / 3600);
        var mm = Math.floor( (ts % 3600) / 60);
        var ss = Math.floor((ts % 3600) % 60);

        //prepend '0' when needed
        hh = hh < 10 ? '0' + hh : hh;
        mm = mm < 10 ? '0' + mm : mm;
        ss = ss < 10 ? '0' + ss : ss;

        //use it
        var str = hh + ":" + mm + "." + ss;

        for (let i = 0; i < 2; i ++) {
            str = str.replace(/^0([1-9]?:.+)/gi, "$1");
            str = str.replace(/^00:(.+)/gi, "$1");    
        }

        str = str.replace(/^0([1-9]?\..+)/gi, "$1");
        

        return str;
    }

    function tickToTimeD(ticks)
    {
        if (ticks == undefined || ticks == "")
            return "&nbsp;";

        var ts = ticks / 1000;

        var mils = Math.floor((ticks % 1000) / 100);

        //conversion based on seconds
        var hh = Math.floor( ts / 3600);
        var mm = Math.floor( (ts % 3600) / 60);
        var ss = Math.floor((ts % 3600) % 60);

        //prepend '0' when needed
        hh = hh < 10 ? '0' + hh : hh;
        mm = mm < 10 ? '0' + mm : mm;
        ss = ss < 10 ? '0' + ss : ss;

        //use it
        var str = hh + ":" + mm + ":" + ss + "." + mils;

        for (let i = 0; i < 2; i ++) {
            str = str.replace(/^0([1-9]?:.+)/gi, "$1");
            str = str.replace(/^00:(.+)/gi, "$1");    
        }

        str = str.replace(/^0([1-9]?\..+)/gi, "$1");
        str = str.replace(/^0(0\..+)/gi, "$1");

        return str;
    }

    function updateRuntimeTimer(lane, value)
    {
        let label = formatFloat(Math.abs(value) / 1000, 1, 'floor');
        var tr = $('#live-realtime tr');
        if(lane === 1) {
            tr.children("td:nth-child(7)").html(label);
        } else {
            tr.children("td:nth-child(9)").html(label);
        }
    }

    function setRuntimeList(fullupdate) {
        var tr = $('#live-realtime tr');

        // clear content
        if (realtime.num == 0 || startlistmap[realtime.num] === undefined) {
            clearRuntimeList();
            return;
        }
        let startlistentry = startlistmap[realtime.num];

        tr.children("td:nth-child(1)").html((realtime.rank===undefined)?"&nbsp":realtime.rank + ".");
        tr.children("td:nth-child(2)").html(realtime.num);
        tr.children("td:nth-child(6)").html(formatPoint(realtime.score.lane1, false));
        tr.children("td:nth-child(8)").html(formatPoint(realtime.score.lane2, false));
        if(fullupdate === true) {
            tr.children("td:nth-child(7)").html(formatTime(realtime.score.lane1, false));
            tr.children("td:nth-child(9)").html(formatTime(realtime.score.lane2, false));
        }

        var horse = horses[startlistentry.horse_idx];
        if (horse !== undefined) {
            tr.children("td:nth-child(3)").html(horse.name);
        } else {
            tr.children("td:nth-child(3)").html("&nbsp");
        }

        var rider = riders[startlistentry.rider_idx];
        if (rider !== undefined) {
            tr.children("td:nth-child(4)").html(rider.lastName + "&nbsp" + rider.firstName);
            tr.children("td:nth-child(5)").css("background", "#232323 url('flags/" + rider.nation + ".bmp') center no-repeat").css("background-size", "contain");
            tr.children("td:nth-child(5)").attr("data-toggle", "tooltip").attr("title", rider.nation);
        } else {
            tr.children("td:nth-child(4)").html("&nbsp");
            tr.children("td:nth-child(5)").html("&nbsp");
        }
    }

    function clearRuntimeList() {
        var tds = $('#live-realtime tr td');
        tds.html("&nbsp");
    }

    function updateRankingList() {
        clearRanking("ranking");

        var index = 1;
        for (let ranking of rankings) {
            addToRankingList("ranking", index++, ranking);
        }
        // clearRankingRemains("ranking", index);
    }

    function clearRankingRemains(tableId, count) {
        while (1) {
            var tr = $('#' + tableId + ' tr:nth-child(' + count + ')');
            if (tr.length == 0)
                break;
            
            tr.remove();
        }
    }

    function updateEventList() {
        $('#live-events').html('');

        for(event of events) {
            $('#live-events').append($('<tr>'));
            tr = $('#live-events tr:last');
            tr.append($('<td>').addClass("col-4 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-6 left").html("&nbsp"));
            tr.append($('<td>').addClass("col-2 center").html("&nbsp"));

            tr.children("td:nth-child(1)").html(event.info.title);
            tr.children("td:nth-child(2)").html(event.info.eventTitle);
            tr.children("td:nth-child(3)").html(formatDate(event.info.event_date));

            tr.attr("data-ref", event.id);

            tr.click(function() {
                evendId = $(this).attr("data-ref");
                joinToEvent(evendId);
            });
        }
    }

    function joinToEvent(eventId) {
        let event = events.find( (event) => {
            return (event.id == eventId);
        });

        if(event === undefined) {
            $("#error_noevent").show();
            return ;
        }

        $("#error_noevent").hide();
        $("#error_finishevent").hide();

        socket.emit("subscribe", eventId);
        curEvent = eventId;

        $('#event_list').hide();
        $('#event_view').show();
        
    }

    // goto event list
    $("#goto-events").click(function () {
        socket.emit('unsubscribe', curEvent);

        clearInterval(rolling_timer);
        timer_running = false;

        $('#error_finishevent').hide();

        $('#event_list').show();
        $('#event_view').hide();

        curview = 1;
    });

    $('#event_view').hide();
    $('#event_list').show();

    $(".nav .nav-link").click(function() {
        $(this).parents("ul").find("div.nav-link").removeClass("active");
        $(this).addClass("active");
    
        var menu_id = $(this).attr("id");
    
        $("section#sec-live").css("display", "none");
        $("section#sec-startlist").css("display", "none");
        $("section#sec-ranking").css("display", "none");
    
        if(menu_id == "nav-live") {
            $("section#sec-live").css("display", "block");
            $("#start-list-body").css("display", "block");
            $("#inter-body").css("display", "block");
            $("#to-finish-body").css("display", "block");
            $("#at-finish-body").css("display", "block");
            $("#ranking-body").css("display", "block");
            view_all_start_list = false;
    
            updateStartList();
        } else if(menu_id == "nav-startlist") {
            $("section#sec-live").css("display", "block");
            $("#start-list-body").css("display", "block");
            $("#inter-body").css("display", "none");
            $("#to-finish-body").css("display", "none");
            $("#at-finish-body").css("display", "none");
            $("#ranking-body").css("display", "none");
            view_all_start_list = true;
            updateStartList();
        } else if(menu_id == "nav-ranking") {
            $("section#sec-live").css("display", "block");
            $("#start-list-body").css("display", "none");
            $("#inter-body").css("display", "none");
            $("#to-finish-body").css("display", "none");
            $("#at-finish-body").css("display", "none");
            $("#ranking-body").css("display", "block");
        }
    });
});




