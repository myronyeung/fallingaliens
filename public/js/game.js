let game = ((args) => {
  "use strict";

  const GAME_WINDOW = document.getElementById("game-window"),
        START_SCREEN = document.getElementById("start-screen"),
        START_SCREEN_START = document.getElementById("start-screen-start"),
        PAUSE_SCREEN = document.getElementById("pause-screen"),
        PLAY_BUTTON = document.getElementById("play-button"),
        SPEED_SLIDER = document.getElementById("speed-slider"),
        SCORE_DISPLAY = document.getElementById("score"),
        MIN_DIAMETER = 30,
        MAX_DIAMETER = 100,
        CREATION_INTERVAL = 1000,
        // Space Invader numbers determined by eye:
        MAX_SPACE_INVADER_SCALE = 8,
        MAX_SPACE_INVADER_MARGIN_TOP = 42,
        MAX_SPACE_INVADER_MARGIN_LEFT = 48,
        COLORS = [
          "yellow",
          "aqua",
          "white",
          "fuchsia",
          "red",
          "blue",
          "olive",
          "green",
          "maroon",
          "navy"
        ];

  let score = 0,
      speed = SPEED_SLIDER.value,
      gameStarted = false,
      shouldPlay = false,
      dots = {},
      dotId = 0,
      { isDev } = args;

  let createDot = () => {
    let id = `dot${dotId}`;
    dots[id] = new Dot({id: id});
    dotId++;
  };

  let createDots = () => {
    if (shouldPlay) {
      createDot();
      window.setTimeout(createDots, CREATION_INTERVAL);
    }
  };

  let play = () => {
    if (shouldPlay) {
      for (var id in dots) {
        if (dots.hasOwnProperty(id)) {
          dots[id].drop();
        }
      }
      requestAnimationFrame(play);
    }
  };

  let removeDot = (id) => {
    delete dots[id];
  };

  // Took from MDN
  // The maximum and minimum are inclusive.
  let getRandomIntInclusive = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; 
  };

  class Dot {
    constructor(args) {
      this.id = args.id;
      this.diameter = getRandomIntInclusive(MIN_DIAMETER, MAX_DIAMETER); 
      this.radius = Math.round(this.diameter / 2);
      this.top = -this.diameter;
      this.scale = this.diameter / MAX_DIAMETER;

      // A dot should never hang off of either side.
      this.left = getRandomIntInclusive(0, GAME_WINDOW.getBoundingClientRect().width - this.diameter);

      // A dot's value is inversely proportional to its size.
      // DISCUSS: Requirements specify that points range from 1-10, but fractional 
      // values do not fit the 1980's aesthetic, so values now range from 30-100, with no fractions. 
      this.points = Math.round(MAX_DIAMETER / this.diameter * 10);

      this.element = this.createElement();
   }

    createElement() {
      let dot = document.createElement("div");

      let spaceInvader = document.createElement("div");
      spaceInvader.classList.add("space-invader");

      // Calculate color of alien based on their diameter.
      // If diameter is max, then subtract by one, so we don't get an array out-of-bounds error.
      let color = COLORS[Math.floor(((this.diameter === MAX_DIAMETER ? this.diameter - 1 : this.diameter) - MIN_DIAMETER) / ((MAX_DIAMETER - MIN_DIAMETER) / COLORS.length))];

      // Round the transform scale to an integer otherwise gaps 
      // may show up in the body of the alien.
      spaceInvader.setAttribute("style", `
        margin: ${Math.round(MAX_SPACE_INVADER_MARGIN_TOP * this.scale)}px 0 0 ${Math.floor(MAX_SPACE_INVADER_MARGIN_LEFT * this.scale)}px;
        transform: scale(${Math.floor(MAX_SPACE_INVADER_SCALE * this.scale)});
      `);

      dot.appendChild(spaceInvader);

      let points = document.createElement("div");
      points.classList.add("points");
      points.setAttribute("style", `
        top: ${this.radius / 2}px;
        `);

      let text = document.createTextNode(this.points);
      points.appendChild(text);

      dot.appendChild(points);

      dot.classList.add("dot");
      dot.setAttribute("id", this.id);
      dot.setAttribute("style", `
        top: ${this.top}px;
        left: ${this.left}px;
        width: ${this.diameter}px;
        height: ${this.diameter}px;
        border-radius: ${this.radius}px;
        background-color: ${color};
      `);
      GAME_WINDOW.appendChild(dot);

      dot.addEventListener("animationend", (evt) => {
        if (evt.animationName === "disappearing") {
          this.cleanup();
        }
      });

      return dot;
    }

    drop() {
      this.top += speed / 60; // requestAnimationFrame runs at roughly 60 Hz.
      this.element.style.top = `${this.top}px`;

      // Remove dot if it falls below GAME_WINDOW.
      // Calling height on GAME_WINDOW every time this function is invoked may not be performant, 
      // but dots can adjust if browser window is resized.
      // Set isDev to true and see dots disappear before they drop below the game window.
      if (this.top >= GAME_WINDOW.getBoundingClientRect().height + (isDev ? 100 : 0)) {
        this.cleanup();
      }
    }

    click() {
      // Don't award points while game is paused.
      if (shouldPlay) {
        this.element.classList.add("clicked");
        score += this.points;
        SCORE_DISPLAY.textContent = score;

        if (isDev) console.log(`${this.id} was clicked for ${this.points} points, diameter of ${this.diameter}`);
      }
    }

    /* Called in two cases: (1) dot falls below screen OR (2) disappear animation ends after dot clicked. */
    cleanup() {
      this.element.parentNode.removeChild(this.element);
      removeDot(this.id);
    }
  }

  // Use event delegation to capture dot clicks.
  GAME_WINDOW.addEventListener("click", (evt) => {
    if (dots[evt.target.id]) {
      dots[evt.target.id].click();
    } else {
      if (isDev) console.log("You missed!");
    }
  });

  [START_SCREEN_START, PLAY_BUTTON].forEach((currentElement) => {
    currentElement.addEventListener("click", (evt) => {
      if(!gameStarted) {
        // Hide Start Screen
        START_SCREEN.classList.toggle("hidden");

        gameStarted = true;
      }

      PLAY_BUTTON.textContent = shouldPlay ? "PLAY" : "PAUSE";

      shouldPlay ? PAUSE_SCREEN.classList.remove("hidden") : PAUSE_SCREEN.classList.add("hidden");

      shouldPlay = !shouldPlay;

      createDots();
      play();
    });
  });

  SPEED_SLIDER.addEventListener("change", (evt) => {
    speed = evt.target.value;
  });

  // Handle edge case when window is backgrounded. requestAnimationFrame does not run which is good, 
  // but dots are still being created. Not working reliably - more study needed.
  //document.addEventListener("visibilitychange", function() {
    //if (document.visibilityState === "hidden") PLAY_BUTTON.click();
  //});

  if (isDev) console.clear();

})({isDev: false});