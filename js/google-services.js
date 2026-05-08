import { GOOGLE_MAPS_API_KEY } from './config.js';

let tokenClient;
let gapiInited = false;
let gsisInited = false;

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
// Authorization scopes required by the API
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

/**
 * Initialize Google Calendar API and Identity Services
 */
export function initGoogleServices(callback) {
  gapi.load('client', async () => {
    await gapi.client.init({
      apiKey: GOOGLE_MAPS_API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    checkBeforeFinished(callback);
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', // From your session log
    scope: SCOPES,
    callback: '', // defined later
  });
  gsisInited = true;
  checkBeforeFinished(callback);
}

function checkBeforeFinished(callback) {
  if (gapiInited && gsisInited && callback) callback();
}

/**
 * Schedule a photography session in Google Calendar
 */
export function scheduleShoot(location, bestTime) {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) throw (resp);
    
    const [hours, minutes] = bestTime.split(':');
    const start = new Date();
    start.setHours(parseInt(hours), parseInt(minutes), 0);
    
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour session

    const event = {
      'summary': `📸 Photo Shoot: ${location.name}`,
      'location': `${location.lat}, ${location.lon}`,
      'description': `Lumina Scout matched this spot to your Visual DNA. \nBest Light: ${bestTime}`,
      'start': { 'dateTime': start.toISOString(), 'timeZone': 'UTC' },
      'end': { 'dateTime': end.toISOString(), 'timeZone': 'UTC' },
    };

    const request = gapi.client.calendar.events.insert({
      'calendarId': 'primary',
      'resource': event,
    });

    request.execute((event) => {
      alert(`Successfully scheduled shoot for ${location.name}! Check your Google Calendar.`);
    });
  };

  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}
