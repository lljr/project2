document.addEventListener('DOMContentLoaded', () => {

  // Send request to create a channel
  document.querySelector("#channelform").onsubmit = () => {
    // Initialize request
    const request = new XMLHttpRequest();
    const channelName = document.querySelector("#channelname").value;
    request.open('POST',"/createchannel");

    request.onload = () => {

      try {
        const data = JSON.parse(request.responseText);
        if (data.success) {
          document.querySelector('#message').innerHTML = `${data.message}`;
          updateLiveChannelsList();
        }
        else {
          document.querySelector('#message').innerHTML = `${data.message}`;
        }

      } catch(e) {
        console.warn("There was a NetworkError.");
      }


    };

    const data = new FormData();
    data.append('channelname', channelName);

    console.log(`channelname is ${JSON.stringify(data)}`);

    // Send request
    request.send(data);
    document.querySelector("#channelname").value = '';
    return false;

  }

  updateLiveChannelsList();

  function updateLiveChannelsList() {
    // TODO Make function accept json as formal parameter to reduce logic burden on this function
    const request = new XMLHttpRequest();

    request.open('GET', "/channels")

    request.onload = () => {

      // TODO check the response from the server whether channels exists
      // to prevent adding the button to the DOM

      let target = document.querySelector("#livechannels .target")

      // Clears out existing list data
      while (target.firstChild) {
        target.removeChild(target.firstChild);
      }

      try {
        const data = JSON.parse(request.responseText);
        // Populate live channels list
        if (data.channels) {
          data.channels.forEach(channel => {
            const cardDiv = document.querySelector("#livechannels");
            cardDiv.setAttribute("class", "card");

            const li = document.createElement("li");
            const joinButton = document.createElement("button");

            joinButton.innerHTML = "Join";
            joinButton.setAttribute("class", "btn btn-primary ml-auto");
            joinButton.setAttribute("type", "button");
            joinButton.addEventListener("click", function() { enterChat(channel).bind(this) });

            li.setAttribute("class", "list-group-item d-flex align-items-center");
            li.append(channel, joinButton);

            target.append(li);
          })
        }

      } catch(e) {
        console.warn("there may have been a NetworkError");
      }


      return null;

    }



    request.send();
    return null;

  }

  function enterChat(name) {

    // Send request to chat room view
    const request = new XMLHttpRequest();
    request.open("GET", `/channel/${channelName}`);
    const buttonThis = this;

    request.onload = function() {
      // TODO open socket to room
      joinRoomChannel(name).bind(buttonThis);
    }

    request.send();
    return null;

  }

  // Connect to websocket
  var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

  // When connected, configure buttons
  socket.on('connect', () => {
    socket.emit('join', {'room': roomName}); // TODO what happens when a person connects to Chat app?
  });

  function joinRoomChannel(roomName) {
    // TODO implement this seperately and load the function in this file....

    // When a new vote is announced, add to the unordered list
    socket.on('join', () => {
          const li = document.createElement('li');
          li.innerHTML = `Vote recorded: ${data.selection}`;
          document.querySelector('#votes').append(li);
      });

    return null;
  }

});
