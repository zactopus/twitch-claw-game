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
      x: 100,
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
  game: {
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

  updateClawFingers({ percentage });
}

// decrease grabometer on a loop
setInterval(() => {
  updateGrab(-1);
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
  const amount = remapNumberRange(percentage, 0, 100, -18, 5);
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
          <div class="claw__instructions__direction claw__instructions__direction--up">
            <div class="claw__instructions__direction__text">up</div>            
            <div class="claw__instructions__direction__symbol">🢁</div> 
          </div>
          <div class="claw__instructions__direction claw__instructions__direction--right">
            <div class="claw__instructions__direction__text">right</div>            
            <div class="claw__instructions__direction__symbol">🢂</div>
          </div>          
          <div class="claw__instructions__direction claw__instructions__direction--down">
            <div class="claw__instructions__direction__text">down</div>            
            <div class="claw__instructions__direction__symbol">🢃</div>
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
          <div class="claw__grab-o-meter__grab-command">"grab"</div>
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

function handleMovement(message) {
  const pixelMovementAmount = 15;

  if (message.includes("up")) {
    STATE.directionMessageCount += 1;
    const { x, y: oldY } = STATE.claw.position;
    const y = oldY - pixelMovementAmount;
    updateClaw({ x, y });
  }

  if (message.includes("right")) {
    STATE.directionMessageCount += 1;
    const { x: oldX, y } = STATE.claw.position;
    const x = oldX + pixelMovementAmount;
    updateClaw({ x, y });
  }

  if (message.includes("down")) {
    STATE.directionMessageCount += 1;
    const { x, y: oldY } = STATE.claw.position;
    const y = oldY + pixelMovementAmount;
    console.log({ x, y });
    updateClaw({ x, y });
  }

  if (message.includes("left")) {
    STATE.directionMessageCount += 1;
    const { x: oldX, y } = STATE.claw.position;
    const x = oldX - pixelMovementAmount;
    updateClaw({ x, y });
  }

  if (STATE.directionMessageCount > 5) {
    STATE.claw.instructions.element.style.opacity = "0";
    STATE.claw.graboMeter.element.style.opacity = "1";
  }

  return;
}

function handleGrab(message) {
  if (message.includes("grab")) {
    updateGrab(10);
  }

  return;
}

function main() {
  const channel = getURLParamChannel();

  // if there's no channel just stop
  if (!channel || channel.length === 0) {
    return;
  }

  const twitchClient = connectBotToChannel(channel);

  twitchClient.on("connected", async () => {
    console.log("connected");

    await loadContent();
    document.body.className = "loaded";

    twitchClient.on("message", (_channel, _tags, message) => {
      /*
        if game has ended dont do anything
      */
      if (STATE.game.ended) {
        return;
      }

      const processedMessage = message.toLowerCase();

      handleMovement(processedMessage);
      handleGrab(processedMessage);
    });
  });
}

main();
