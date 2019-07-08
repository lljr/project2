document.addEventListener("DOMcontentloaded", () => {
  var socket = io.connect(location.protocol + "//" + document.domain + ":" + location.port);

  socket.on("connect", () => {

  });

})
