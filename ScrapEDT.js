const INPUT_ID = "GInterface.Instances[1].Instances[1].bouton_Edit";
const NAME_ID = "GInterface.Instances[1].Instances[1]_0";
const DAYS_HEADER_ID = "GInterface.Instances[1].Instances[7]_Contenu_TitreHaut";
const DAY_CLASS = "Calendrier_Jour_td";
const COURSE_CLASS = "cours-simple";
const COURSE_CONTENT = "contenu";
const COURSE_CONTENT_PREFIX = "Accéder à l'emploi du temps de ";
const DISABLED_WEEK_CLASS = "Calendrier_JourInactif";
const START_YEAR = 2022;

async function getEDT(name) {
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

function getCoursesWeek(header) {
  let days = {};
  for (let day of header.childNodes) {
    days[day.getBoundingClientRect().left + 1] = day.firstChild.innerHTML
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

function createCalendar(events) {
  let calendar = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
${events.map((event, i) => createEvent(event, i)).join("")}END:VCALENDAR
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
DESCRIPTION:${description}
TRANSP:OPAQUE
END:VEVENT
`;
}

function getTime(date) {
  var month = (date.getMonth() + 1).toString().padStart(2, "0");
  var year = date.getMonth() > 6 ? START_YEAR : START_YEAR + 1;
  var day = date.getDate().toString().padStart(2, "0");
  var hours = date.getHours().toString().padStart(2, "0");
  var minutes = date.getMinutes().toString().padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}00Z`;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(() => resolve(), ms));
}

(async () => console.log(await getEDT("beauchet")))();
