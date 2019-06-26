document.addEventListener('DOMContentLoaded', () => {

  // Send request to create a channel
  document.querySelector("#channelform").onsubmit = () => {

    // Initialize request
    const request = new XMLHttpRequest();
    const channelName = document.querySelector("#channelname").value;
    request.open('POST',"/createchannel");

    request.onload = () => {
      const data = JSON.parse(request.responseText);

      if (data.success) {
        document.querySelector('#message').innerHTML = `${data.message}`;
        updateLiveChannelsList();
      }
      else {
        document.querySelector('#message').innerHTML = `There was an error`;
      }
    };

    const data = new FormData();
    data.append('channelname', channelName);

    // Send request
    request.send(data);
    document.querySelector("#channelname").value = '';
    return false;

  }


  function updateLiveChannelsList() {
    const request = new XMLHttpRequest();
    request.open('GET', "/channels")

    request.onload = () => {

      const data = JSON.parse(request.responseText);

      if (data.channels) {
        data.channels.forEach(channel => {
          const li = document.createElement('li');
          li.innerHTML = channel;
          document.querySelector("#livechannels .target").append(li);
        })
      }

      return null;

    }

    request.send();
    return null;

  }

});
