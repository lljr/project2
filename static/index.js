document.addEventListener('DOMContentLoaded', () => {

  // if (!localStorage.getItem('username')) {
  //   localStorage.setItem('username', () => {
  //   })
  // }
  // Send request to create a channel
  document.querySelector("#channelform").onsubmit = () => {

    // Initialize request
    const request = new XMLHttpRequest();
    const channelName = document.querySelector("#channelname").value;
    request.open('POST',"/createchannel");

    // Callback function for when request completes
    request.onload = () => {
      // Extract JSON from response
      const data = JSON.parse(request.responseText);
      console.log(data)
      console.log(`data success ${data.success}`)
      console.log(`request success ${data.success}`)
      // Update the result div
      if (request.success) {
        // data.channel & data.message
        document.querySelector('#message').innerHTML = `${data.message}`;
        console.log(data.message);

      }
      else {
        document.querySelector('#message').innerHTML = `There was an error`;
        console.log(data.message);

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
