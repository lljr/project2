document.addEventListener('DOMContentLoaded', () => {
  const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

  // When connected, configure buttons
  socket.on('connect', () => {

    console.log("connected!")
      // TODO Check again that username localStorage value is not empty (account for reconnection)
    // TODO Remove Login Form again and show Channel creation input

    const ul = document.querySelector("#livechannels > ul");
    if(!localStorage.getArray("channels")) {
      console.log("first login after connection");
      localStorage.setItem("channels", "[]");
      channels.forEach(channel => updateChannelsList(channel, ul, updateStorage="yes"));
      console.log("storage updated if there are channels");
    }
    // Persist channels list after page refresh
    else if (localStorage.getArray("channels").length) {
      clearOutListData(ul);
      console.log("i refreshed")
      const localChannels = localStorage.getArray("channels");
      localChannels.forEach(channel => updateChannelsList(channel, ul));
    }

    document.querySelector("#channelform").onsubmit = () => {
      const channelNameInput = document.querySelector("#channelname");

      socket.emit('create channel', {
        'channel': channelNameInput.value
      })

      // Clear out input field
      channelNameInput.value = '';

      return false;
    }

    // https://davidwalsh.name/event-delegate
    ul.addEventListener("click", e => joinRoom(e));
  });

  socket.on('disconnect', () => {
    console.log('conn done!');
    localStorage.clear();
  });

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
    // TODO grab message for when user authenticates but sends empty form
//    console.log("message sent" + JSON.stringify(data));

  });

  socket.on("json", data => {
    JSON.parse(data);
    switch(data.type) {
    case "sync":
      const channels = data.channels;
      // There are channels in server and storage is empty
      if (data.channels.length && !localStorage.getArray("channels").length) {
        console.log('fetching channels...')
        const ul = document.querySelector("#livechannels > ul");
        clearOutListData(ul)
        channels.forEach(channel => updateChannelsList(channel,
                                                      ul,
                                                      updateStorage="yes"));
      }
      break;

    }

  });

});

// TODO When logging out, clear localStorage
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

function joinRoom(event) {
  const clickedEl = event.target;
  if (clickedEl.nodeName === "LI") {
    // TODO check the user joined the channel
    // TODO switchChatView()
  } else if (clickedEl.nodeName === "BUTTON") {
    const li = clickedEl.parentNode;
    // TODO switchChatView()

    socket.emit('join', {
      "room": li.dataset.channel
    });

  }
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
