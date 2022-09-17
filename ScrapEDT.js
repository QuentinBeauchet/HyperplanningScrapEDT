const INPUT_ID = "GInterface.Instances[1].Instances[1].bouton_Edit";
const NAME_ID = "GInterface.Instances[1].Instances[1]_0";
const DAYS_HEADER_ID = "GInterface.Instances[1].Instances[7]_Contenu_TitreHaut";
const DAY_CLASS = "Calendrier_Jour_td";
const COURSE_CLASS = "cours-simple";
const COURSE_CONTENT = "contenu";
const COURSE_CONTENT_PREFIX = "Accéder à l'emploi du temps de ";
const DISABLED_WEEK_CLASS = "Calendrier_JourInactif";
const START_YEAR = 2022;
const LEFT_ZOOM_DIFF = 7;
const GMT_OFFSET = 2;

/**
 * Generate the .ics calendar and return it's string.
 * @param {String} name The name of the student.
 * @returns The .ics calendar as string.
 */
async function getEDT(name) {
  document.body.style.zoom = "25%";
  let input = document.getElementById(INPUT_ID);
  input.value = name;
  input.dispatchEvent(new Event("keypress", { which: 13 }));

  return await new Promise((resolve) =>
    waitID(NAME_ID).then((el) => {
      el.click();
      waitID(DAYS_HEADER_ID).then(() => {
        getWeeks().then((courses) => resolve(createCalendar(courses)));
      });
    })
  );
}

/**
 * Get the courses for each week of the year.
 * @returns all the courses of the year.
 */
async function getWeeks() {
  let courses = [];
  let notThisWeek = false;
  for (let week of document.getElementsByClassName(DAY_CLASS)) {
    let child = week.firstChild;
    if (child.classList.contains(DISABLED_WEEK_CLASS)) continue;
    let { x, y } = child.getBoundingClientRect();
    child.dispatchEvent(new MouseEvent("mousedown", { clientX: x, clientY: y, bubbles: true }));
    child.dispatchEvent(new MouseEvent("mouseup", { clientX: x, clientY: y, bubbles: true }));

    let el = await waitID(DAYS_HEADER_ID);
    if (notThisWeek) courses.push(...getCoursesWeek(el));
    notThisWeek = true;
    await sleep(50);
  }
  return courses;
}
/**
 * Return the courses displayed for this week.
 * @param {HTMLElement} header
 * @returns the courses displayed for this week.
 */
function getCoursesWeek(header) {
  let days = {};
  for (let day of header.childNodes) {
    days[day.getBoundingClientRect().left + LEFT_ZOOM_DIFF] = day.firstChild.innerHTML
      .replace("février", "feb")
      .replace("avril", "apr")
      .replace("mai", "may")
      .replace("juin", "jun")
      .replace("juillet", "jul")
      .replace("décembre", "dec");
  }

  let courses = [];
  for (let course of document.getElementsByClassName(COURSE_CLASS)) {
    let split = course.title.replaceAll("h", ":").split(" ");
    let left = course.getBoundingClientRect().left;
    let time = {
      from: `${days[left]} ${split[1]}`,
      to: `${days[left]} ${split[3]}`,
    };

    let contents = [];
    for (let content of course.getElementsByClassName(COURSE_CONTENT)) {
      if (content.firstChild.tagName == "LABEL") {
        contents.push(content.firstChild.innerHTML);
      } else if (content.firstChild.tagName == "SPAN") {
        contents.push(content.lastChild.textContent);
      } else {
        contents.push(content.innerHTML);
      }
    }
    courses.push({
      time,
      subject: contents.shift(),
      description: contents.join(" - "),
      location: "",
    });
  }
  return courses;
}

/**
 * Wait for the HTML Element with this ID to be visible in the DOM.
 * @param {String} id
 * @returns The HTML element
 */
function waitID(id) {
  return new Promise((resolve) => {
    let waiting = setInterval(() => {
      let el = document.getElementById(id);
      if (el) {
        clearInterval(waiting);
        resolve(el);
      }
    }, 10);
  });
}

/**
 * Generate the .ics calendar.
 * In the map the +10 is because Google calendar ignore events with an uid < 10.
 * @param {Array[Object]} events
 * @returns
 */
function createCalendar(events) {
  let calendar = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
${events.map((event, i) => createEvent(event, i + 100)).join("")}END:VCALENDAR
`;

  let blob = new Blob([calendar], {
    type: "text/calendar",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "calendar.ics";
  link.click();

  return calendar;
}

/**
 * Generate an .ics event.
 * @param {Object} args The informations of the course
 * @param {int} uid
 * @returns The VEVENT String to add to the VCALENDAR
 */
function createEvent({ time, subject, description, location }, uid) {
  return `BEGIN:VEVENT
DTSTART:${getTime(new Date(time.from))}
DTEND:${getTime(new Date(time.to))}
DTSTAMP:20220916T040207Z
UID:${uid}
CREATED:20220916T040207Z
LAST-MODIFIED:20220916T040207Z
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:${subject}
LOCATION:${location}
${foldLine(`DESCRIPTION:${description}`)}
TRANSP:OPAQUE
END:VEVENT
`;
}

/**
 * Get the correct date format for an .ics file.
 * @param {Date} date
 * @returns String like 20220324T083000Z for 03/24/2022 08:30:00
 */
function getTime(date) {
  let realDate = new Date(date.setHours(date.getHours() - GMT_OFFSET));
  var month = (realDate.getMonth() + 1).toString().padStart(2, "0");
  var year = realDate.getMonth() > 6 ? START_YEAR : START_YEAR + 1;
  var day = realDate.getDate().toString().padStart(2, "0");
  var hours = realDate.getHours().toString().padStart(2, "0");
  var minutes = realDate.getMinutes().toString().padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}00Z`;
}

/**
 * Sleep for the duration in ms.
 * @param {int} ms
 */
async function sleep(ms) {
  await new Promise((resolve) => setTimeout(() => resolve(), ms));
}

/**
 * To avoid the 75 word per line limit
 * @param {String} line
 * @returns The line split by CLRF endings
 */
function foldLine(line) {
  const parts = [];
  while (line.length > 60) {
    parts.push(line.slice(0, 60));
    line = line.slice(60);
  }
  parts.push(line);
  return parts.join("\r\n\t");
}

(async () => console.log(await getEDT("beauchet")))();
