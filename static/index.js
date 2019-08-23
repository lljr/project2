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

    ul.addEventListener("click", e => joinOrLeaveRoom(e));

    const logout = document.querySelector("#logout");
    logout.addEventListener("click",  clearAll);

    function clearAll() {
      var oReq = new XMLHttpRequest();
      oReq.addEventListener("load", function() {
        const jsonRes = JSON.parse(this.responseText);
        window.location.href = `${jsonRes.address}`; // redirect back to login form
        if (localStorage.getItem("joined")) {
          socket.emit("leave", {
            "username": localStorage.getItem("username"),
            "room": localStorage.getItem("joined")
          });
          localStorage.clear();
        }
        localStorage.clear();
      });
      oReq.open("GET", "/leave");
      oReq.send(null);
    }

  });

  socket.on('disconnect', () =>{
    console.log("disconnected from chat.")
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
      const channelsList = document.querySelector("#livechannels > ul");
      syncWithServer(channelsList,
                     data.channels,
                     data.username);
      break;
    case "message":
      const msg = document.createElement("li");
      console.log("new msg");
      insertNew(msg, {
        id: data.id,
        content: data.message,
        sender: data.sender,
        date: data.date,
      }, data.room);
      msg.scrollIntoView(); // MAYBE FIXME
      break;
    case "notification":
      insertNotification(data.room, data.message)
      break;
    case "join":
      console.log("am i joining")
      console.log(data.room)
      setUpChatRoom(data.room);
      fetchPreviousMsgs(data.room,  data.messages);
      break;
    case "refresh":
      // Similar to 'join' but does not trigger msg broadcast in room
      const current = localStorage.getItem("joined");
      setUpChatRoom(current);
      fetchPreviousMsgs(current, data.messages);
      break;
    case "deletion":
      handleDeleteMessage(data.id, data.sender, data.content, data.date);
      break;
    }
  });

  function insertNew(newMsg, msg, roomJoined) {

    newMsg.id = msg.id;
    newMsg.textContent = addTimestamp(addSender(msg.content, msg.sender), msg.date);

    // Add message to conversation board
    document.querySelector(`#${roomJoined}-msglist`).appendChild(newMsg);

    newMsg.className = (msg.sender === "???")? "font-italic text-muted" : "font-bold";

    // Add a delete button if the sender and user logged in are the same
    if (msg.sender === localStorage.getItem("username")) {
      // TODO Refactor button object creation with 'new'
      const btn = createBootstrapCloseIcon(); // I know there is a way to do this with 'new' ...
      btn.addEventListener("click", deleteMessage);
      newMsg.appendChild(btn);
    }
  }

  function fetchPreviousMsgs(room, messages) {
    // Fetch messages and populate into chat room
    messages.forEach(message => {
      const msg = document.createElement("li");
      insertNew(msg, {
        id: message.id,
        content: message.content,
        sender: message.sender,
        date: message.date
      }, room);

    });
  }

  function handleDeleteMessage(id, sender, content, date) {
    const msg = document.querySelector(`#${id}`);
    msg.textContent = addTimestamp(addSender(content, sender), date);
    msg.className = "font-italic text-muted";
  }

  function deleteMessage() {

    socket.emit("delete message", {
      "sender": localStorage.getItem("username"),
      "room": localStorage.getItem("joined"),
      "id": this.parentNode.id     // li --> this.parentNode
    });
    console.log("deleting msg");
  }

  function createBootstrapCloseIcon() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "close ml-auto";
    btn.setAttribute("aria-label", "Close");

    const span = document.createElement("span");
    span.setAttribute("aria-hidden", "true")
    span.innerHTML = "&times;";

    btn.appendChild(span);

    return btn;
  }

  function insertNotification(room, message) {
    const msg = document.createElement("li");
    msg.textContent = message;
    msg.style.color = "Gray";
    document.querySelector(`#${room}-msglist`).appendChild(msg);
    msg.scrollIntoView();
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
    title.setAttribute("class", "mb-auto border-bottom text-center pb-2");
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
    sendMsgForm.addEventListener("submit", function (event) {
      handleMsgSending(event)
    });
  }

  function handleMsgSending(e) {
    e.preventDefault();
    // TODO Refactor using `this`
    const msgList = e.currentTarget.parentNode.querySelector("ul");
    const input = e.currentTarget.querySelector("input");
    const btn = e.currentTarget.querySelector("button");

    const msg = document.createElement("li");
    const username = localStorage.getItem("username");

    socket.send({
      "room": msgList.dataset.room,
      "username": username,
      "message": input.value
    }, ok => {
      // TODO Add notification for status of sent msg
      //  This would be good as an extra feature (Peronsal Touch)
      // if (ok === "ok") {
      //  btn.disabled = true;
      //  input.value = '';
      // } else {
      //   alert("Could not deliver message. Try again.");
      // }
    });
    e.currentTarget.reset();
    btn.disabled = true;
  }

  function addSender(message, username) {
    // Associates message with sender
    return `<${username}> ${message}`;
  }

  function addTimestamp(message, date) {
    // Adds time of creation to message
    const now = new Date(date);
    if (Number.isNaN(now.getMinutes())) {
      return `[...] ${message}`;
    }
    const formattedMinutes = (parseInt(now.getMinutes()) <= 9? "0" + now.getMinutes() : now.getMinutes());
    const formattedHours = (parseInt(now.getHours()) <= 9? "0" + now.getHours() : now.getHours());
    return `[${formattedHours}:${formattedMinutes}] ${message}`;
  }

  function joinOrLeaveRoom(event) {

    /* Allow user to join only _1_ room at a time */
    // https://davidwalsh.name/event-delegate
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
        room: joinedRoom,
      }, ok => {
        const allOK = ok === "ok";
        if (allOK) {
          const btn = document.querySelector(`#channel-item-${joinedRoom} button`);
          toggleChannel(btn, "Leave", "primary", "warning");
        } else {
          console.log("An Error occured when trying to leave room.")
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
    const tellUserMsg = document.createElement("h4");
    tellUserMsg.textContent = "Join a channel to chat.";
    tellUserMsg.className = "text-center my-auto";
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
