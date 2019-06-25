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
    return false;

  }

});
