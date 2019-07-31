document.addEventListener('DOMContentLoaded', () => {

  // Connect to websocket
  var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

  // When connected, configure buttons
  socket.on('connect', () => {

    const ul = document.querySelector("#livechannels > ul");
    if(!localStorage.getArray("channels")) {
      console.log("i connected");
      localStorage.setItem("channels", "[]");
    }
    // Persist channels list after page refresh
    else if (localStorage.getArray("channels").length) {
      clearOutListData(ul);
      console.log("i refreshed")
      const channelsArray = localStorage.getArray("channels");
      channelsArray.forEach(channel => updateChannelsList(channel, ul));
      // https://davidwalsh.name/event-delegate
      // Ul.addEventListener("click", event => enterChat(channel, event.ChannelElement));
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

  socket.on("channels", data => {

    //Sync server and client on first login
    const channels = data.channels;

    // There are channels in server and storage is empty (first login or user deleted it?)
    if (data.channels.length && !localStorage.getArray("channels").length) {
      console.log('fetching channels...')
      const ul = document.querySelector("#livechannels > ul");
      clearOutListData(ul)
      channels.forEach(channel => updateChannelsList(channel,
                                                    ul,
                                                    updateStorage="yes"));
    }
  });

});

function setUsernameForm(mainRow, socket) {
  // TODO needs work....
  const form = document.querySelector("#user-form");

  form.onsubmit = () => {

    const username = input.value;


    input.value = '';

    return false;
  };
}

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
