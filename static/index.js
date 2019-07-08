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
          document.querySelector('#message').innerHTML = `There was an error`;
        }

      } catch(e) {
        console.warn("There was an error!");
      }


    };

    const data = new FormData();
    data.append('channelname', channelName);

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
            joinButton.addEventListener("click", () => { enterChat(channel) });

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

});
