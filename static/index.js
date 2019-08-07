document.addEventListener('DOMContentLoaded', () => {
  const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

  // When connected, configure buttons
  socket.on('connect', () => {

    document.querySelector("#channelform").onsubmit = () => {
      const channelNameInput = document.querySelector("#channelname");
      socket.emit('create channel', {
        'channel': channelNameInput.value
      })

      // Clear out input field
      channelNameInput.value = '';
      return false;
    }

    const ul = document.querySelector("#livechannels > ul");
    // https://davidwalsh.name/event-delegate
    ul.addEventListener("click", e => joinRoom(e));
  });

  socket.on('disconnect', () => localStorage.clear());

  socket.on('channel created?', data => {
    document.querySelector('#message').innerHTML = `${data.message}`;
    // Assume data.channel comes empty when channel already exists
    // if not then update the channels list by appending the last channel
    if (data.channel)
      updateChannelsList(data.channel,
                         document.querySelector("#livechannels > ul"),
                         updateStorage="yes");
  });

  socket.on("message", data => {
    console.log(data);
    // TODO move this to message handler function
    // const message = document.createElement("li");
    // message.textContent = message;
    // parentList.appendChild(message);

  });

  socket.on("json", data => {

    console.log(data);

    switch(data.type) {
    case "sync":
      syncWithServer(document.querySelector("#livechannels > ul"),
                     data.channels,
                     data.username);
      break;
    case "message":
      console.log(data);
      break;

    }

  });

  function setUpChatRoom(room) {
    // Show room

    // TODO Clean up function signature
    const convoContainer = document.querySelector("#chat-convos");

    const chatRoom = document.createElement("div");
    chatRoom.setAttribute("class", "col");
    // For now it is a board... perhaps in the future the chat rooms will have tabbed views
    chatRoom.setAttribute("id", `${room}-board`);

    convoContainer.appendChild(chatRoom);

    // TODO handle pushing to joined rooms local storage array outside of this function
    const title = document.createElement("h4");
    title.textContent = room;
    const parentList = document.createElement("ul");
    parentList.setAttribute("id", `${room}-msglist`);
    parentList.setAttribute("data-room", room);

    parentList.appendChild(title);

    const sendMsgs = document.createElement("form");
    const msgInput = document.createElement("input");
    msgInput.setAttribute("id", `${room}-msg`);

    const sendMsgButton = document.createElement("button");
    sendMsgButton.textContent = "Send";

    sendMsgs.appendChild(msgInput);
    sendMsgs.appendChild(sendMsgButton);

    chatRoom.appendChild(parentList);
    chatRoom.appendChild(sendMsgs);

    // TODO Refactor so that messages get sent to server
    sendMsgs.addEventListener("submit", event => handleMsgSending(event) );
  }

  function handleMsgSending(e) {
    const msgList = e.currentTarget.parentNode.querySelector("ul");

    const input = e.currentTarget.querySelector("input");

    const msg = document.createElement("li");

    msg.textContent = input.value;
    msgList.appendChild(msg);

    socket.send({
      "room": msgList.dataset.room,
      "username": localStorage.getItem("username"),
      "message": input.value
    }, (ok)=> {
      console.log("ok");
    })

    e.currentTarget.reset();
    e.preventDefault();
  }

  // TODO Add this when message reply is implemented
  // function insertMsgToChatRoom(e) {
  //   const msgList = e.currentTarget.parentNode.querySelector("ul");

  //   const input = e.currentTarget.querySelector("input");

  //   const msg = document.createElement("li");

  //   msg.textContent = input.value;
  //   msgList.appendChild(msg);

  //   e.currentTarget.reset();
  //   e.preventDefault();
  // }

  function joinRoom(event) {
    const clickedEl = event.target;
    if (clickedEl.nodeName === "LI") {
      console.log("i clicked list!")
      // TODO check the user joined the channel
      // TODO switchChatView()
      // This is local
    } else if (clickedEl.nodeName === "BUTTON") {
      const li = clickedEl.parentNode;
      // TODO switchChatView()
      // This requires server manipulation
      if(clickedEl.textContent === "Join") {
        let name = localStorage.getItem("username");

        socket.emit('join', {
          username: name,
          room: li.dataset.channel
        }, ok => {
          // TODO Handle refresh so that msgs persists and chat room doesnt get added again to DOM
          if (ok === "ok") {
            clickedEl.textContent = "Leave";
            clickedEl.classList.remove("btn-primary");
            clickedEl.classList.add("btn-warning");

            setUpChatRoom(li.dataset.channel);
          }
        });
      }



    }
}

});

function syncWithServer(ul, channels, username) {

  // On login
  if (!localStorage.getItem("username")) {
    localStorage.setItem("username", username);
    localStorage.setItem("channels", "[]");
    localStorage.setItem("joined", "[]");
    channels.forEach(channel => updateChannelsList(channel, ul, updateStorage="yes"));
  }

  // For some reason, maybe it was a page refresh, if so then
  // Persist channels list afterwards but from localStorage
  if (localStorage.getArray("channels").length) {
    clearOutListData(ul);
    const localChannels = localStorage.getArray("channels");
    localChannels.forEach(channel => updateChannelsList(channel, ul));
  }

}

function updateChannelsList(channelName, ul, updateStorage="no") {

  // TODO The Join button only needs to be created once?
  const joinButton = document.createElement("button");
  setUpJoinChannelButton(joinButton)

  if (updateStorage === "yes")
    localStorage.pushArrayItem('channels', channelName);

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
