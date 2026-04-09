from datetime import datetime

class HealthStore:
    def __init__(self):
        self._data = {
            'feeds': {
                'usgs_earthquakes': {'last_success': None, 'last_error': None, 'consecutive_failures': 0},
                'usgs_volcanoes':   {'last_success': None, 'last_error': None, 'consecutive_failures': 0},
                'usgs_hans':        {'last_success': None, 'last_error': None, 'consecutive_failures': 0},
                'gvp_eruptions':    {'last_success': None, 'last_error': None, 'consecutive_failures': 0},
                'noaa_dart':        {'last_success': None, 'last_error': None, 'consecutive_failures': 0},
                'noaa_vaac':        {'last_success': None, 'last_error': None, 'consecutive_failures': 0},
            },
            'alert_job': {
                'last_run':     None,
                'last_success': None,
                'last_error':   None,
                'runs_total':   0,
                'runs_ok':      0,
            },
            'email': {
                'sent_total':  0,
                'sent_ok':     0,
                'sent_failed': 0,
                'last_sent':   None,
                'last_error':  None,
            },
            'alerts_queue': {
                'processed_total': 0,
                'last_processed':  None,
            }
        }

    def feed_ok(self, feed: str):
        f = self._data['feeds'].get(feed)
        if f:
            f['last_success']         = datetime.utcnow().isoformat()
            f['consecutive_failures'] = 0

    def feed_error(self, feed: str, error: str):
        f = self._data['feeds'].get(feed)
        if f:
            f['last_error']           = f"{datetime.utcnow().isoformat()} — {error}"
            f['consecutive_failures'] += 1

    def alert_job_start(self):
        self._data['alert_job']['last_run']    = datetime.utcnow().isoformat()
        self._data['alert_job']['runs_total'] += 1

    def alert_job_ok(self, alerts_processed: int = 0):
        self._data['alert_job']['last_success'] = datetime.utcnow().isoformat()
        self._data['alert_job']['last_error']   = None
        self._data['alert_job']['runs_ok']     += 1
        self._data['alerts_queue']['processed_total'] += alerts_processed
        if alerts_processed:
            self._data['alerts_queue']['last_processed'] = datetime.utcnow().isoformat()

    def alert_job_error(self, error: str):
        self._data['alert_job']['last_error'] = f"{datetime.utcnow().isoformat()} — {error}"

    def email_sent(self, ok: bool, error: str = None):
        self._data['email']['sent_total'] += 1
        if ok:
            self._data['email']['sent_ok']  += 1
            self._data['email']['last_sent'] = datetime.utcnow().isoformat()
        else:
            self._data['email']['sent_failed'] += 1
            self._data['email']['last_error']   = f"{datetime.utcnow().isoformat()} — {error}"

    def get(self):
        return self._data

health = HealthStore()
