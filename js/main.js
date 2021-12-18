/* global tmi */

function remapNumberRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

function getRandomNumber(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const WINDOW_WIDTH = 1280;
const WINDOW_HEIGHT = 720;

const STATE = {
  directionMessageCount: 0,
  target: {
    element: null,
    width: 100,
    height: 100,
    position: {
      x: 0,
      y: 0,
    },
  },
  claw: {
    element: null,
    width: 200,
    height: 200,
    position: {
      x: 60,
      y: 100,
    },
    fingers: {
      left: {
        element: null,
      },
      right: {
        element: null,
      },
    },
    instructions: {
      element: null,
    },
    graboMeter: {
      element: null,
      progressBar: {
        element: null,
        amount: 0,
        maxAmount: 400,
      },
    },
  },
  timer: {
    element: null,
    countdown: 30,
  },
  joystick: {
    element: null,
  },
  game: {
    canChatGrab: false,
    canChatMoveClaw: true,
    ended: false,
  },
};

function getURLParamChannel() {
  const params = new URLSearchParams(document.location.search.substring(1));
  return params.get("channel");
}

function connectBotToChannel(channel) {
  const twitchClient = new tmi.Client({
    connection: { reconnect: true },
    channels: [channel],
  });
  twitchClient.connect();
  return twitchClient;
}

async function wait(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

function updateGrab(newAmountChange) {
  // grab cant below 0
  if (STATE.claw.graboMeter.progressBar.amount + newAmountChange < 0) {
    return;
  }

  // grab cant go above max
  if (
    STATE.claw.graboMeter.progressBar.amount + newAmountChange >
    STATE.claw.graboMeter.progressBar.maxAmount
  ) {
    return;
  }

  STATE.claw.graboMeter.progressBar.amount += newAmountChange;
  const percentage = Math.min(
    100,
    Math.floor(
      (STATE.claw.graboMeter.progressBar.amount /
        STATE.claw.graboMeter.progressBar.maxAmount) *
        100
    )
  );

  STATE.claw.graboMeter.progressBar.element.style.top = `${100 - percentage}%`;
  STATE.claw.graboMeter.progressBar.element.style.backgroundColor = `hsl(${percentage}, 45%, 45%)`;

  updateClawFingers({ percentage });
}

// decrease grabometer on a loop
setInterval(() => {
  updateGrab(-5);
}, 100);

function updateClaw(newPosition) {
  const { x, y } = newPosition;

  // can't go out of bounds x
  if (x < 0 || x > WINDOW_WIDTH - STATE.claw.width) {
    return;
  }

  // can't go out of bounds y
  if (y < 0 || y > WINDOW_HEIGHT - STATE.claw.height) {
    return;
  }

  STATE.claw.position = newPosition;
  STATE.claw.element.style.transform = `translate(${x}px, ${y}px)`;
}

function updateClawFingers({ percentage }) {
  const amount = remapNumberRange(percentage, 0, 100, -30, 5);
  STATE.claw.fingers.left.element.style.transform = `rotate(${amount * -1}deg)`;
  STATE.claw.fingers.right.element.style.transform = `rotate(${amount}deg)`;
}

async function loadContent() {
  document.body.innerHTML = `
    <main>
      <div class="timer"></div>

      <div class="column column--left"></div>
      <div class="column column--right"></div>

      <div class="winbox"></div>
      <div class="joystick"></div>
      <div class="joystick-box"></div>

      <div class="panel panel--top"></div>

      <div class="claw">
        <div class="claw__hand">
          <div class="claw__hand__finger claw__hand__finger--left"></div>
          <div class="claw__hand__finger claw__hand__finger--right"></div>
        </div>
        <div class="claw__hand-cable"></div>
        <div class="claw__instructions">
          <div class="claw__instructions__text">
            Move the claw<br />Type in chat
          </div>
          <div class="claw__instructions__direction claw__instructions__direction--right">
            <div class="claw__instructions__direction__text">right</div>            
            <div class="claw__instructions__direction__symbol">🢂</div>
          </div>
          <div class="claw__instructions__direction claw__instructions__direction--left">
            <div class="claw__instructions__direction__text">left</div>            
            <div class="claw__instructions__direction__symbol">🢀</div>
          </div>
        </div>
        <div class="claw__grab-o-meter">
          <div class="claw__grab-o-meter__text">Grab-o-meter</div>
          <div class="claw__grab-o-meter__progress">
            <div class="claw__grab-o-meter__progress__bar"></div>
          </div>
          <div class="claw__grab-o-meter__grab-command">grab</div>
        </div>
      </div>

      <div class="target"></div>

      <div class="panel panel--bottom"></div>
    </main>
  `;

  STATE.target.element = document.querySelector(".target");
  STATE.claw.element = document.querySelector(".claw");
  STATE.claw.fingers.left.element = document.querySelector(
    ".claw__hand__finger--left"
  );
  STATE.claw.fingers.right.element = document.querySelector(
    ".claw__hand__finger--right"
  );
  STATE.claw.instructions.element = document.querySelector(
    ".claw__instructions"
  );
  STATE.claw.graboMeter.element = document.querySelector(".claw__grab-o-meter");
  STATE.claw.graboMeter.progressBar.element = document.querySelector(
    ".claw__grab-o-meter__progress__bar"
  );
  STATE.timer.element = document.querySelector(".timer");
  STATE.joystick.element = document.querySelector(".joystick");

  // move claw to right place
  updateClaw({ x: STATE.claw.position.x, y: STATE.claw.position.y });
  updateClawFingers({ percentage: 0 });

  // move target to bottom
  const spacer = 100;
  const minimumLeft = 400; // TODO: this should be the win bin when i add this
  const x = getRandomNumber(
    spacer + minimumLeft,
    WINDOW_WIDTH - STATE.target.width - spacer
  );
  const y = getRandomNumber(370, WINDOW_HEIGHT - STATE.claw.height - spacer);
  console.log({ x, y });
  STATE.target.element.style.transform = `translate(${x}px, ${y}px)`;

  await wait(500);
}

function endTheGame({ twitchClient, countdownTimeout }) {
  STATE.game.ended = true;
  if (countdownTimeout) clearTimeout(countdownTimeout);
  twitchClient.disconnect();
}

function handleMovement({ message, user }) {
  const pixelMovementAmount = 30;

  if (!STATE.game.canChatMoveClaw) {
    return;
  }

  if (message.includes("left")) {
    emitUser(user);
    STATE.directionMessageCount += 1;
    const { x: oldX, y } = STATE.claw.position;
    const x = oldX - pixelMovementAmount;
    moveJoystick({ left: true });
    updateClaw({ x, y });
  }

  if (message.includes("right")) {
    emitUser(user);
    moveJoystick({ right: true });
    STATE.directionMessageCount += 1;
    const { x: oldX, y } = STATE.claw.position;
    const x = oldX + pixelMovementAmount;
    updateClaw({ x, y });
  }

  return;
}

function handleGrab({ message, user }) {
  if (!STATE.game.canChatGrab) {
    return false;
  }

  if (message.includes("grab")) {
    emitUser(user);
    updateGrab(50);
  }

  return;
}

function updateTimer() {
  STATE.timer.element.innerText = `${STATE.timer.countdown}s`;
}

let joystickTimeout = null;
function moveJoystick({ left, right }) {
  if (joystickTimeout) {
    clearTimeout(joystickTimeout);
    joystickTimeout = null;
  }

  if (left) {
    STATE.joystick.element.style.transform = "rotate(-10deg)";
  }

  if (right) {
    STATE.joystick.element.style.transform = "rotate(10deg)";
  }

  joystickTimeout = setTimeout(() => {
    STATE.joystick.element.style.transform = "rotate(0deg)";
  }, 500);
}

function atEndOfCountdown() {
  // stop chat from being able move claw
  STATE.game.canChatMoveClaw = false;

  // hide timer
  STATE.timer.element.style.opacity = 0;

  // hide instruction
  STATE.claw.instructions.element.style.opacity = "0";

  // move claw to bottom of the screen
  const { x } = STATE.claw.position;
  const y = WINDOW_HEIGHT - STATE.claw.height - 100;
  updateClaw({ x, y });

  // let chat start grabbing
  STATE.game.canChatGrab = true;
  STATE.claw.graboMeter.element.style.opacity = "1";
}

async function moveClawBackToWinArea() {
  // wait so people can grab
  await wait(7500);

  const delay = 2000;
  STATE.claw.element.style.transitionDuration = `${delay}ms`;

  // move claw to top of the screen
  const { x } = STATE.claw.position;
  updateClaw({ x, y: 100 });
  await wait(delay + 100);

  // move claw to the left
  const { y } = STATE.claw.position;
  updateClaw({ x: 60, y });
  await wait(delay + 100);

  STATE.game.canChatGrab = false;
  STATE.claw.graboMeter.element.style.opacity = "0";
  STATE.claw.graboMeter.progressBar.amount = 0;
  updateClawFingers({ percentage: 0 });
  STATE.game.ended = true;
}

async function emitUser(user) {
  const animationDuration = 1000;

  const userElement = document.createElement("div");
  userElement.className = "user";
  userElement.style.animationDuration = `${animationDuration}ms`;

  const userTextElement = document.createElement("div");
  userTextElement.className = "user__text";

  userTextElement.innerText = user.username;
  userTextElement.style.color = user.color || "#fff";
  const translateString = `translate(${getRandomNumber(
    -15,
    50
  )}%,  ${getRandomNumber(-15, 15)}%)`;
  const rotateString = `rotate(${getRandomNumber(-10, 10)}deg)`;
  userTextElement.style.transform = `${translateString} ${rotateString}`;

  userElement.appendChild(userTextElement);
  document.body.appendChild(userElement);

  await wait(animationDuration + 100);
  userElement.remove();
}

async function main() {
  await loadContent();
  document.body.className = "loaded";

  const channel = getURLParamChannel();

  // if there's no channel just stop
  if (!channel || channel.length === 0) {
    return;
  }

  const twitchClient = connectBotToChannel(channel);

  twitchClient.on("connected", () => {
    console.log("connected");

    STATE.claw.instructions.element.style.opacity = "1";
    STATE.timer.element.style.opacity = "1";

    updateTimer();
    const countdownInterval = setInterval(() => {
      if (STATE.timer.countdown === 0) {
        clearInterval(countdownInterval);
        atEndOfCountdown();
        moveClawBackToWinArea();
        return;
      }

      STATE.timer.countdown -= 1;
      updateTimer();
    }, 1000); // 1 sec

    twitchClient.on("message", (_channel, data, message) => {
      const processedMessage = message.toLowerCase();
      const isBroadcaster =
        data && data.badges && data.badges.broadcaster === "1";
      const user = {
        username: data.username,
        color: data.color,
        isBroadcaster,
      };

      if (user.isBroadcaster && processedMessage.includes("restart")) {
        window.location.reload();
        return;
      }

      /*
        if game has ended dont do anything
      */
      if (STATE.game.ended) {
        return;
      }

      handleMovement({ message: processedMessage, user });
      handleGrab({ message: processedMessage, user });
    });
  });
}

main();
