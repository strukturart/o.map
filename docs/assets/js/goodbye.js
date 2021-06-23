window.goodbye = function () {
  document.getElementById("goodbye").style.display = "block";

  if (localStorage.clickcount) {
    localStorage.clickcount = Number(localStorage.clickcount) + 1;
  } else {
    localStorage.clickcount = 1;
  }

  if (localStorage.clickcount == 3) {
    message();
  } else {
    document.getElementById("ciao").style.display = "block";
    setTimeout(function () {
      window.close();
    }, 4000);
  }

  function message() {
    document.getElementById("donation").style.display = "block";
    setTimeout(function () {
      localStorage.clickcount = 1;

      window.close();
    }, 6000);
  }
};
