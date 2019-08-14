document.addEventListener('DOMContentLoaded', () => {
  const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

  // When connected, configure buttons
  socket.on('connect', () => {

    const createChannel = document.querySelector("#channelform");
    createChannel.addEventListener(function(event) {

      const channelNameInput = document.querySelector("#channelname");
      socket.emit('create channel', {
        'channel': channelNameInput.value
      });

      event.currentTarget.reset();
      event.target.preventDefault();
    });

    const ul = document.querySelector("#livechannels > ul");
    // https://davidwalsh.name/event-delegate
    ul.addEventListener("click", e => joinRoom(e));
  });

});

socket.on('disconnect', () => localStorage.clear());

socket.on('channel created?', data => {
  document.querySelector('#message').innerHTML = `${data.message}`;
  // Assume data.channel comes empty when channel already exists
  // if not then update the channels list by appending the last channel
  if (data.channel)
    updateChannelsList(data.channel,
                       document.querySelector("#livechannels > ul"));
});

socket.on("message", data => { console.log(data)  });

socket.on("json", data => {

  switch(data.type) {
  case "sync":
    syncWithServer(document.querySelector("#livechannels > ul"),
                   data.channels,
                   data.username);
    break;
  case "message":
    inserNewMsg(data);
    break;
  case "join":

    break;

  }

});



function inserNewMsg(data) {
  const room = document.querySelector(`#${data.room}-msglist`);
  const li = document.createElement("li");

  // Append msg immediately if sent by server
  if (!data.sender) {
    li.textContent = message;
    room.appendChild(li);
  }

  if (data.sender !== localStorage.getItem("username")) {
    const date = new Date(data.date)

    li.textContent = addTimestamp(addSender(data.content, data.sender),
                                  date);
    room.appendChild(li);
  }
}

function setUpChatRoom(room) {

  const convoContainer = document.querySelector("#chat-convos");

  // Show room
  const chatRoom = document.createElement("div");
  chatRoom.setAttribute("class", "col");
  chatRoom.setAttribute("id", `${room}-board`);

  convoContainer.appendChild(chatRoom);

  // Each room gets a title
  const title = document.createElement("h4");
  title.textContent = room;

  // Creates a list of messages
  const parentList = document.createElement("ul");
  parentList.setAttribute("id", `${room}-msglist`);
  parentList.setAttribute("data-room", room);

  parentList.appendChild(title);

  // Where messages will be typed
  const sendMsgs = document.createElement("form");
  const msgInput = document.createElement("input");
  msgInput.setAttribute("id", `${room}-msg`);

  const sendMsgButton = document.createElement("button");
  sendMsgButton.textContent = "Send";

  // Make room appear in window
  sendMsgs.appendChild(msgInput);
  sendMsgs.appendChild(sendMsgButton);
  chatRoom.appendChild(parentList);
  chatRoom.appendChild(sendMsgs);

  // Send typed messages to server
  sendMsgs.addEventListener("submit", event => handleMsgSending(event) );
}

function handleMsgSending(e) {

  const msgList = e.currentTarget.parentNode.querySelector("ul");
  const input = e.currentTarget.querySelector("input");

  const msg = document.createElement("li");

  const rightNow = new Date();
  const username = localStorage.getItem("username");

  msg.textContent = addTimestamp(addSender(input.value, username), rightNow);
  msgList.appendChild(msg);

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

function joinRoom(event) {
  const clickedEl = event.target;

  if (clickedEl.nodeName === "LI") {
    console.log("i clicked list!")
    // TODO check the user joined the channel
    // TODO switchChatView()
    // This is local
  } else if (clickedEl.nodeName === "BUTTON") {
    const li = clickedEl.parentNode;
    const room = li.dataset.channel;

    // TODO switchChatView()
    // This requires server manipulation
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

          setUpChatRoom(room);

          const roomMsgList = document.querySelector(`#${room}-msglist`);
          messages.forEach(message => {
            const li = document.createElement("li");
            li.textContent = addTimestamp(addSender(message.content, message.sender), message.date);
            roomMsgList.appendChild(li);
          });


        }
      });
    }



  }
}

});

function syncConversation() {};

function syncWithServer(ul, channels, username) {

  // On login
  if (!localStorage.getItem("username")) {
    localStorage.setItem("username", username);
    localStorage.setItem("channels", "[]");
    clearOutListData(ul);
    channels.forEach(channel => updateChannelsList(channel, ul));
  }
}

function updateChannelsList(channelName, ul) {

  // TODO The Join button only needs to be created once?
  const joinButton = document.createElement("button");
  setUpJoinChannelButton(joinButton)

  const li = document.createElement("li");
  setUpChannelListElement(li, joinButton, channelName);

  // Set the card class here to prevent styling to appear on page
  // and take space on the screen when there are no chat rooms alive
  if (!ul.parentNode.getAttribute("class"))
    ul.parentNode.setAttribute("class", "card");

  ul.append(li);
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


// ======= Storage helper functions start here =======
// https://stackoverflow.com/a/23516713
Storage.prototype.getArray = function(arrayName) {
  var thisArray = [];
  var fetchArrayObject = this.getItem(arrayName);
  if (typeof fetchArrayObject !== 'undefined') {
    if (fetchArrayObject !== null) { thisArray = JSON.parse(fetchArrayObject); }
  }
  return thisArray;
}

Storage.prototype.pushArrayItem = function(arrayName,arrayItem) {
  var existingArray = this.getArray(arrayName);
  existingArray.push(arrayItem);
  this.setItem(arrayName,JSON.stringify(existingArray));
}

Storage.prototype.popArrayItem = function(arrayName) {
  var arrayItem = {};
  var existingArray = this.getArray(arrayName);
  if (existingArray.length > 0) {
    arrayItem = existingArray.pop();
    this.setItem(arrayName,JSON.stringify(existingArray));
  }
  return arrayItem;
}

Storage.prototype.shiftArrayItem = function(arrayName) {
  var arrayItem = {};
  var existingArray = this.getArray(arrayName);
  if (existingArray.length > 0) {
    arrayItem = existingArray.shift();
    this.setItem(arrayName,JSON.stringify(existingArray));
  }
  return arrayItem;
}

Storage.prototype.unshiftArrayItem = function(arrayName,arrayItem) {
  var existingArray = this.getArray(arrayName);
  existingArray.unshift(arrayItem);
  this.setItem(arrayName,JSON.stringify(existingArray));
}

Storage.prototype.deleteArray = function(arrayName) {
  this.removeItem(arrayName);
}
// ======= Storage helper functions end here =======
