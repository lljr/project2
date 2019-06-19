document.addEventListener('DOMContentLoaded', () => {

  // create a username if none set
  if (!localStorage.getItem('username')) {
    localStorage.setItem('username', "")
  }

  // if username is empty
  // hide channel item in navbar menu
  // else, show it as an option
  // maybe i could use disabled attribute???

});
