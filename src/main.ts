import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

export const loginToken = "ddfe8409fc818c6b5a70ce88a55737c7ae5504977704df10f9762a8d29137a855c5afc45096cb02587e4280cbc3c7a918e62c794d1d6987f8105375a849ef71945087b5e24a008eee4fbd4d12d0c1b5a4ba2e50e5543252c8dd82e1ddd5461ab4ee73f74712412a72428f3c389001fb9645a1f45992898c2e98fccadaa4394ac5ebd532ced35e6931adce034003978a52fe4d432913a96fb864cfb412e7dd7071763ba0afcfad45241ffd92d820cf4b41714613042c05d5cb5f9a93a9240509fd47c0a1e64988a37490a11e64f18bbcdf29e028991b1b2a5be6c0fc2ac5a472c";

export const viewPresettt = {
  "tickWidth": 120,
  "displayDateFormat": "DD.MM.YYYY hh:MM",
  "shiftIncrement": 1,
  "shiftUnit": "minute",
  "defaultSpan": 1,
  "timeResolution": {
    "unit": "minute",
    "increment": 60
  },
  "headers": [
    {
      "unit": "day",
      "dateFormat": "DD MMMM"
    },
    {
      "unit": "minute",
      "dateFormat": "HH:mm",
      "increment": 60
    }
  ],
  "columnLinesFor": 1
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
