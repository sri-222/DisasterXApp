import { safetyTips, weatherMood } from '../weatherAdvice';

const base = { temperature: 30, feelsLike: 31, wind: 3, humidity: 60 };

describe('weatherMood', () => {
  it('reads condition text from both weather sources', () => {
    expect(weatherMood('Thunderstorm with slight hail')).toBe('storm');
    expect(weatherMood('Heavy rain and thunder')).toBe('storm');
    expect(weatherMood('Light rain showers')).toBe('rain');
    expect(weatherMood('Partly cloudy')).toBe('cloudy');
    expect(weatherMood('Clear sky')).toBe('clear');
    expect(weatherMood('Fog')).toBe('fog');
    expect(weatherMood('Unknown conditions')).toBe('unknown');
    expect(weatherMood(undefined)).toBe('unknown');
  });
});

describe('safetyTips', () => {
  it('warns about flooding in heavy rain', () => {
    const tips = safetyTips({ ...base, conditions: 'Heavy rain' });
    expect(tips[0]).toMatchObject({ level: 'danger', title: 'Heavy rain' });
  });

  it('warns about heat from the feels-like temperature', () => {
    const tips = safetyTips({ ...base, conditions: 'Clear sky', feelsLike: 41 });
    expect(tips.map(t => t.title)).toContain('Extreme heat');
  });

  it('says conditions are safe when nothing is risky', () => {
    const tips = safetyTips({ ...base, conditions: 'Clear sky' });
    expect(tips).toHaveLength(1);
    expect(tips[0].title).toBe('No weather risks right now');
  });
});
