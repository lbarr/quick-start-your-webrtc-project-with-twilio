'use strict';

// VARIABLES 
var id;
var lmedia;
var conversation;
var conversationsClient;
var fid;
var firebase;
var disconnected = false;

// CHECK IF A WEBRTC BROWSER 
if (!navigator.webkitGetUserMedia && !navigator.mozGetUserMedia) {
    tlog('You are using a browser that is not WebRTC compatible, please use Google Chrome or Mozilla Firefox</div>', true);
}

// GET TWILIO TOKEN AND ACCESS TO CONVERSATION
$('#start').on('click', function() {
    if ($('#id').val() == '') {
        tlog('Please enter a name to join the chat</div>', true);
    } else {
        id = $('#id').val().replace(/\s+/g, '');
        $.ajax({
            type: 'POST',
            url: 'token.php',
            data: {
                id: $('#id').val()
            },
            dataType: "json",
            success: function(data) {
                var accessManager = new Twilio.AccessManager(data.token);
                conversationsClient = new Twilio.Conversations.Client(accessManager);
                conversationsClient.listen().then(clientConnected, function(e) {
                    tlog('Could not connect to Twilio: ' + e.message + ' </div>', true);
                });
            }
        });
    }
});

// SUCCESSFULLY CONNECTED TO TWILIO CONVERSATION
function clientConnected() {
    var fburl = '...add your firebase url here...';
    firebase = new Firebase(fburl + '/users');
    var uid = firebase.push(id);
    fid = uid.toString();
    new Firebase(fid).onDisconnect().remove();
    firebase.on('child_added', function(child) {
        if (child.val() != id) {
            $('.users-list').append('<div class="user ' + child.val() + '"><span>' + child.val() + '</span><button class="b-connect" id="' + child.val() + '">Call Now</button></div>');
        }
    });
    firebase.on('child_removed', function(child) {
        $('.' + child.val()).remove();
    });
    $('#id, #start').hide();
    $('#disconnect').fadeIn();
    $('#status').css({
        'color': '#5E9F21'
    }).text('CONNECTED').fadeOut().fadeIn().fadeOut().fadeIn().fadeOut().fadeIn();
    tlog('You have succussfully connected to this Twilio chat room as <strong>' + id + '</strong>.');
    if (!lmedia) {
        lmedia = new Twilio.Conversations.LocalMedia();
        Twilio.Conversations.getUserMedia().then(function(mediaStream) {
            lmedia.addStream(mediaStream);
            lmedia.attach('#lstream');
        }, function(e) {
            tlog('We were unable to access your Camera and Microphone.');
        });
    };
    conversationsClient.on('invite', function(invite) {
        invite.accept().then(conversationStarted);
        tlog('You have a incoming invite from: <strong>' + invite.from + '</strong>');
    });
}

// CONNECT TO A USER IN  THE CHATROOM 
$(document).on('click', '.b-connect', function() {
    var user = $(this).attr('id');
    var options = {};
    options.localMedia = lmedia;
    conversationsClient.inviteToConversation(user, options).then(conversationStarted, function(error) {
        tlog('We were unable to create the chat conversation with that user, try another online user.', true);
    });
});

// TWILIO CONVERSTATION STARTED
function conversationStarted(convo) {
    conversation = convo;
    tlog('We are waiting on your friend to connect...');
    conversation.on('participantConnected', function(participant) {
        new Firebase(fid).remove();
        participant.media.attach('#rstream');
        tlog('You are connected with: <strong>' + participant.identity + '</strong>');
    });
    conversation.on('participantDisconnected', function(participant) {
		if(!disconnected){
			var uid = firebase.push(id);
			fid = uid.toString();
			new Firebase(fid).onDisconnect().remove();
		}
        $('.' + participant.identity).remove();
        tlog('<strong>' + participant.identity + '</strong> has disconnected from this chat.');
        $('.users-list').empty();
		if(firebase){
			firebase.once('child_added', function(child) {
				if (child.val() != id) {
					$('.users-list').append('<div class="user ' + child.val() + '"><span>' + child.val() + '</span><button class="b-connect" id="' + child.val() + '">Call Now</button></div>');
				}
			});
		}
    });
}

// DISCONNECT FROM TWILIO CONVERSATION
$('#disconnect').on('click', function() {
    new Firebase(fid).remove();
    firebase.off();
	firebase = null;
	disconnected = true;
    $('#disconnect').hide();
    $('#start, #id').fadeIn();
    $('#status').css({
        'color': ''
    }).text('DISCONNETED').fadeOut().fadeIn().fadeOut().fadeIn().fadeOut().fadeIn();
    $('.users-list').empty();
    if (conversation) {
        lmedia.stop();
        conversation.disconnect();
        conversationsClient = null;
        conversation = null;
        lmedia = null;
        tlog('You have successfully disconnected from this chat conversation, start another one now.');
    } else {
        lmedia.stop();
        lmedia = null;
        tlog('Please rejoin the chatroom to start a conversation.');
    }
});

// LOGS 
function tlog(msg, e) {
    if (e) {
        $('.logs').append('<div class="log error">' + msg + '</div>');
    } else {
        $('.logs').append('<div class="log">' + msg + '</div>');
    }
}
