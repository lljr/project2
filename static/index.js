document.addEventListener('DOMContentLoaded', () => {
  const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

  // When connected, configure buttons
  socket.on('connect', () => {

    console.log("connected!")
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
  });

  socket.on('disconnect', () =>{
    console.log("disconnected!")
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

  socket.on("message", data => {console.log(data)});

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
      inserNewMsg(data);
      break;
    case "join":
      setUpChatRoom(data.room);

      // Fetch messages and populate into chat room
      const roomMsgList = document.querySelector(`#${data.room}-msglist`);
      data.messages.forEach(message => {
        const li = document.createElement("li");
        date = new Date(message.date);
        li.textContent = addTimestamp(addSender(message.content, message.sender), date);
        roomMsgList.appendChild(li);
      });
      break;
    }

  });

  function inserNewMsg(data) {
    const room = document.querySelector(`#${data.room}-msglist`);
    const li = document.createElement("li");

    // Msg sent by server notifying new user joins chat
    if (!data.sender) {
      li.textContent = data.message;
      li.style.color = "Gray";
      room.appendChild(li);
    }
    else if (data.sender !== localStorage.getItem("username")) {
      const date = new Date(data.date)
      li.textContent = addTimestamp(addSender(data.message, data.sender),
                                    date);
      room.appendChild(li);
    }
  }

  function setUpChatRoom(room) {

    const convoContainer = document.querySelector("#chat-convos");

    // Show room
    const chatRoomRow = document.createElement("div");
    chatRoomRow.setAttribute("class", "row message-board no-gutters");

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
    inputGroup.setAttribute("class", "input-group mb-3");

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

    // Send typed messages to server
    sendMsgForm.addEventListener("submit", event => handleMsgSending(event) );
  }

  function handleMsgSending(e) {

    const msgList = e.currentTarget.parentNode.querySelector("ul");
    const input = e.currentTarget.querySelector("input");

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

    e.currentTarget.reset();
    e.preventDefault();
  }

  function addSender(message, username) {
    // Associates message with sender
    return `<${username}> ${message}`;
  }

  function addTimestamp(message, date) {
    // Adds time of creation to message
    return `[${date.getHours()}:${date.getMinutes()}] ${message}`;
  }

  function joinOrLeaveRoom(event) {

    const clickedEl = event.target;

    // Allow user to only join _1_ room=
    if (clickedEl.nodeName === "BUTTON") {
      const li = clickedEl.parentNode;
      const room = li.dataset.channel;

      if(clickedEl.textContent === "Join") {
        let name = localStorage.getItem("username");

        socket.emit('join', {
          username: name,
          room: room
        }, (ok, messages) => {
          // TODO Handle refresh so that msgs persists and chat room doesnt get added again to DOM
          // i.e. second to last pset requirement
          if (ok === "ok") {
            clickedEl.textContent = "Leave";
            clickedEl.classList.remove("btn-primary");
            clickedEl.classList.add("btn-warning");
          }
        });
      }

    }
  }

  function syncWithServer(ul, channels, username) {
    // On login
    if (!localStorage.getItem("username")) {
      localStorage.setItem("username", username);
    }

    // Should always populate channels list
    clearOutListData(ul);
    channels.forEach(channel => updateChannelsList(channel, ul));
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

  function clearOutListData(ul) {
    // Clears out existing list data `li` on a `ul` parent node
    while (ul.firstChild) {
      ul.removeChild(ul.firstChild);
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
