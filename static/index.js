document.addEventListener('DOMContentLoaded', () => {
  // Connect to socket
  const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

  // When connected, configure buttons
  socket.on('connect', () => {

    const createChannel = document.querySelector("#channelform");
    createChannel.addEventListener("submit", event => {

      const channelNameInput = document.querySelector("#channelname");
      socket.emit('create channel', {
        'channel': channelNameInput.value
      });

      event.currentTarget.reset();
      event.preventDefault();
    });

    const ul = document.querySelector("#livechannels > ul");
    // https://davidwalsh.name/event-delegate
    ul.addEventListener("click", e => joinOrLeaveRoom(e));

    const logout = document.querySelector("#logout");
    function clearAll() {
      var oReq = new XMLHttpRequest();
      oReq.addEventListener("load", function() {
        const jsonRes = JSON.parse(this.responseText);
        window.location.href = `${jsonRes.address}`;
        localStorage.clear();
      });
      oReq.open("GET", "/leave");
      oReq.send(null);
    }
    logout.addEventListener("click",  clearAll);
  });

  socket.on('disconnect', () =>{
    // localStorage.clear(); This makes no sense...
  });

  socket.on('channel created?', data => {
    document.querySelector('#message').innerHTML = `${data.message}`;
    // Assume data.channel comes empty when channel already exists
    // if not then update the channels list by appending the last channel
    if (data.channel)
      updateChannelsList(data.channel,
                         document.querySelector("#livechannels > ul"));
  });

  socket.on("json", data => {
    switch(data.type) {
    case "sync":
      // Check if there are active channels first
      const channelsList = document.querySelector("#livechannels > ul");
      syncWithServer(channelsList,
                     data.channels,
                     data.username);
      break;
    case "message":
      insertNewMsg(data);
      break;
    case "join":
      setUpChatRoom(data.room);
      updateRoomWithFetchedMsgs(data.room, data.messages);
      break;
    case "refresh":
      setUpChatRoom(data.room);
      updateRoomWithFetchedMsgs(data.room, data.messages);
      break;
    }
  });

  function updateRoomWithFetchedMsgs(room, messages) {
    // Fetch messages and populate into chat room
    const roomMsgList = document.querySelector(`#${room}-msglist`);
    messages.forEach(message => {
      const li = document.createElement("li");
      date = new Date(message.date);
      li.textContent = addTimestamp(addSender(message.content, message.sender), date);
      roomMsgList.appendChild(li);
    });
  }

  function insertNewMsg(data) {
    const room = document.querySelector(`#${data.room}-msglist`);
    const msg = document.createElement("li");

    // Msg built by server
    if (!data.sender) {
      if (localStorage.getItem("joined") === data.room) {
        msg.textContent = data.message;
        msg.style.color = "Gray";
        room.appendChild(msg);

        msg.scrollIntoView();

      }
    }
    // NOTE The problem with this flow right now is that when a user sends a message it gets
    // immediately inserted in to the user's conversation board regardless of any error that may
    // have occured in the server -- giving false positives (no conversation board updated) to the other users.

    // TODO When a user sends a message, give feedback and allow user to resend msg
    else if (data.sender !== localStorage.getItem("username")) {
      const date = new Date(data.date)
      msg.textContent = addTimestamp(addSender(data.message, data.sender),
                                    date);
      room.appendChild(msg);

      msg.scrollIntoView();
    }
  }

  function setUpChatRoom(room) {

    const convoContainer = document.querySelector("#chat-convos");
    // Clear out existing chat convos
    clearOutData(convoContainer);

    // Show room
    const chatRoomRow = document.createElement("div");
    chatRoomRow.setAttribute("class", "row message-board no-gutters p-3 rounded");

    const chatRoom = document.createElement("div");
    chatRoom.setAttribute("class", "col");
    chatRoom.setAttribute("id", `${room}-board`);

    convoContainer.appendChild(chatRoomRow);
    chatRoomRow.appendChild(chatRoom);

    // Each room gets a title
    const title = document.createElement("h4");
    title.textContent = room;
    title.setAttribute("class", "mb-auto border-bottom");
    chatRoom.appendChild(title);

    // Creates a list of messages
    const parentList = document.createElement("ul");
    parentList.setAttribute("id", `${room}-msglist`);
    parentList.setAttribute("data-room", room);
    parentList.setAttribute("class", "p-0 mt-2 text-wrap");


    // Create form structure
    const sendMsgForm = document.createElement("form");
    const inputGroup = document.createElement("div");
    inputGroup.setAttribute("class", "input-group");

    const inputGroupBtnWrapper = document.createElement("div");
    inputGroupBtnWrapper.setAttribute("class", "input-group-append");


    // Where messages will be typed
    const msgInput = document.createElement("input");
    msgInput.setAttribute("id", `${room}-msg`);
    msgInput.setAttribute("class", "form-control");
    msgInput.setAttribute("placeholder", "Type a message");
    msgInput.setAttribute("aria-label", "Sender's message");
    msgInput.setAttribute("aria-describedby", "basic-addon2");


    const sendMsgButton = document.createElement("button");
    sendMsgButton.textContent = "Send";
    sendMsgButton.setAttribute("class", "input-group-text btn btn-secondary");

    inputGroup.appendChild(msgInput);
    inputGroupBtnWrapper.appendChild(sendMsgButton);
    inputGroup.appendChild(inputGroupBtnWrapper);

    // Make room appear in window
    sendMsgForm.appendChild(inputGroup);
    chatRoom.appendChild(parentList);
    chatRoom.appendChild(sendMsgForm);

    // By default, submit button is disabled
    sendMsgForm.disabled = true;
    sendMsgButton.disabled = true;

    // Enable button only if there is text in the input field
    msgInput.addEventListener("keyup", () => {
      if (msgInput.value.length > 0)
        sendMsgButton.disabled = false;
      else
        sendMsgButton.disabled = true;
    });

    // Send typed messages to server
    sendMsgForm.addEventListener("submit", event => handleMsgSending(event) );
  }

  function handleMsgSending(e) {

    const msgList = e.currentTarget.parentNode.querySelector("ul");
    const input = e.currentTarget.querySelector("input");
    const btn = e.currentTarget.querySelector("button");

    const msg = document.createElement("li");

    const rightNow = new Date();
    const username = localStorage.getItem("username");

    msg.textContent = addTimestamp(addSender(input.value, username), rightNow);
    msgList.appendChild(msg);

    msg.scrollIntoView();

    socket.send({
      "room": msgList.dataset.room,
      "username": username,
      "message": input.value
    }, ok => {
      // TODO If not ok ask to resend message
      console.log("ok");
    });

    btn.disabled = true;
    e.currentTarget.reset();
    e.preventDefault();
  }

  function addSender(message, username) {
    // Associates message with sender
    return `<${username}> ${message}`;
  }

  function addTimestamp(message, date) {
    // Adds time of creation to message
    const formattedMinutes = (parseInt(date.getMinutes()) <= 9? "0" + date.getMinutes() : date.getMinutes());
    const formattedHours = (parseInt(date.getHours()) <= 9? "0" + date.getHours() : date.getHours());
    return `[${formattedHours}:${formattedMinutes}] ${message}`;
  }

  function joinOrLeaveRoom(event) {

    /* Allow user to join only _1_ room at a time */
    const clickedEl = event.target;
    if (clickedEl.nodeName === "BUTTON") {
      const li = clickedEl.parentNode;
      let username = localStorage.getItem("username");

      if(clickedEl.textContent === "Join") {
        const roomToJoin = li.dataset.channel;
        socket.emit('join', {
          username: username,
          room: roomToJoin
        }, ok => {

          const allOK = ok === "ok";

          /* ====================== 2 Cases ============================ */
          // 1. On login, first time joining a room
          if (allOK && !localStorage.getItem("joined")) {
            localStorage.setItem("joined", roomToJoin);
            toggleChannel(clickedEl, "Leave", "primary", "warning");
          }

          // 2. On a room chatting, but switching to new room
          if (allOK && localStorage.getItem("joined") !== roomToJoin) {
            implicitlyLeavingRoom(localStorage.getItem("joined"),
                                  roomToJoin, username,
                                  clickedEl);
          }
          /* =========================================================== */

        });

      } else {
        const roomToLeave = li.dataset.channel;
        explicitlyLeavingRoom(username, roomToLeave, clickedEl);
      }

    }
  }

  function explicitlyLeavingRoom(username, room, btn) {
    //User is explicitly leaving the room
    socket.emit("leave", {
      username: username,
      room: room
    }, ok => {
      if (ok === "ok") {
        // Update tab window in the UI right column
        const convoContainer = document.querySelector("#chat-convos");
        clearOutData(convoContainer); // Clear out existing chat convos
        noChannelsJoinedMsg(convoContainer);
        localStorage.removeItem("joined");
        toggleChannel(btn, "Join", "warning", "primary");
      }
    });
  }

  function implicitlyLeavingRoom(roomToLeave, roomToJoin, username, btn) {
    socket.emit("leave", {
      username: username,
      room: roomToLeave // held in localStorage during this moment
    }, ok => {

      // On "Live Channels" list, toggle the BUTTON's text content to 'join'
      const prevJoinedBtn = document.querySelector(`#channel-item-${roomToLeave} button`);
      toggleChannel(prevJoinedBtn, "Join", "warning", "primary");

      // On "Live Channels" list, toggle the BUTTON's text content to 'leave'
      toggleChannel(btn, "Leave", "primary", "warning");

      localStorage.removeItem("joined"); // forget old chat room
      localStorage.setItem("joined", roomToJoin);  // Update to current clicked room
    });

  }


  function syncWithServer(ul, channels, username) {
    // On login
    if (!localStorage.getItem("username")) {
      localStorage.setItem("username", username);
    }

    // Page should always populate channels list
    clearOutData(ul);
    channels.forEach(channel => updateChannelsList(channel, ul));

    const convoContainer = document.querySelector("#chat-convos");
    if (!localStorage.getItem("joined")) {
      // Do the updating of the tab window in the UI
      noChannelsJoinedMsg(convoContainer);
    } else {
      const joinedRoom = localStorage.getItem("joined");
      socket.emit('refresh', {
        username: localStorage.getItem("username"),
        room: localStorage.getItem("joined"),
      }, ok => {
        const allOK = ok === "ok";
        if (allOK) {
          const btn = document.querySelector(`#channel-item-${joinedRoom} button`);
          toggleChannel(btn, "Leave", "primary", "warning");
        }
      });
    }

  }

  function toggleChannel(btn, leaveOrJoin, prevStyle, newStyle) {
    btn.textContent = leaveOrJoin;
    btn.classList.remove(`btn-${prevStyle}`);
    btn.classList.add(`btn-${newStyle}`);
  }

  function updateChannelsList(channelName, ul) {

    // Create a 'join' button
    const joinButton = document.createElement("button");
    setUpJoinChannelButton(joinButton)

    // Create list element that indicates the available chat room
    const li = document.createElement("li");
    setUpChannelListElement(li, joinButton, channelName);

    // Style the list as a card when there is at least one item
    if (!ul.parentNode.getAttribute("class"))
      ul.parentNode.setAttribute("class", "card");

    ul.appendChild(li);
  }

  function noChannelsJoinedMsg(elementToUpdate) {
    const tellUserMsg = document.createElement("p");
    tellUserMsg.textContent = "Join a channel to start chatting.";
    elementToUpdate.appendChild(tellUserMsg);
  }

  function clearOutData(element) {
    // Clears out existing data child nodes on `element` parent node
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function setUpJoinChannelButton(button) {
    button.innerHTML = "Join";
    button.setAttribute("class", "btn btn-primary ml-auto");
    button.setAttribute("type", "button");
  }

  function setUpChannelListElement(li, button, channelName) {
    li.setAttribute("class", "list-group-item d-flex align-items-center");
    li.setAttribute("id", `channel-item-${channelName}`);
    li.setAttribute("data-channel", `${channelName}`);
    li.append(channelName, button);
  }

});
