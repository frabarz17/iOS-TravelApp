export type BackgroundItem = {
  id: string;
  label: string;
  source: number;
};

export type BackgroundCategory = {
  id: string;
  label: string;
  items: BackgroundItem[];
};

export const BACKGROUND_CATEGORIES: BackgroundCategory[] = [
  {
    id: 'destinations',
    label: 'Famous Places',
    items: [
      { id: 'new-york',     label: 'New York',     source: require('../../assets/images/rich/backgrounds/newyork-pexels-ninauhlikova.jpg') },
      { id: 'london',       label: 'Londra',        source: require('../../assets/images/rich/backgrounds/london-pexels-dominikagregus.jpg') },
      { id: 'paris',        label: 'Parigi',        source: require('../../assets/images/rich/backgrounds/paris-pexels-solyartphotos.jpg') },
      { id: 'rome',         label: 'Roma',          source: require('../../assets/images/rich/backgrounds/rome-pexels-medialensking.jpg') },
      { id: 'tokyo',        label: 'Tokyo',         source: require('../../assets/images/rich/backgrounds/tokyo-pexels-francesco-albanese.jpg') },
      { id: 'dubai',        label: 'Dubai',         source: require('../../assets/images/rich/backgrounds/dubai-pexels-ahsan.jpg') },
      { id: 'barcelona',    label: 'Barcellona',    source: require('../../assets/images/rich/backgrounds/barcelona-pexels-axp-photography.jpg') },
      { id: 'amsterdam',    label: 'Amsterdam',     source: require('../../assets/images/rich/backgrounds/amsterdam-pexels-marceloverfe.jpg') },
      { id: 'sydney',       label: 'Sydney',        source: require('../../assets/images/rich/backgrounds/sydney-pexels-parth-patel.jpg') },
      { id: 'bangkok',      label: 'Bangkok',       source: require('../../assets/images/rich/backgrounds/bangkok-pexels-dale.jpg') },
      { id: 'singapore',    label: 'Singapore',     source: require('../../assets/images/rich/backgrounds/singapore-pexels-realcereal.jpg') },
      { id: 'istanbul',     label: 'Istanbul',      source: require('../../assets/images/rich/backgrounds/Instanbul-pexels-axp-photography.jpg') },
      { id: 'prague',       label: 'Praga',         source: require('../../assets/images/rich/backgrounds/prague-pexels-jarod.jpg') },
      { id: 'lisbon',       label: 'Lisbona',       source: require('../../assets/images/rich/backgrounds/lisbon-pexels-dan-raz.jpg') },
      { id: 'budapest',     label: 'Budapest',      source: require('../../assets/images/rich/backgrounds/budapest-pexels-burkaycanatar.jpg') },
      { id: 'los-angeles',  label: 'Los Angeles',   source: require('../../assets/images/rich/backgrounds/losangeles-pexels-snapwire.jpg') },
      { id: 'miami',        label: 'Miami',         source: require('../../assets/images/rich/backgrounds/miami-pexels-daniel-reynaga.jpg') },
      { id: 'berlin',       label: 'Berlino',       source: require('../../assets/images/rich/backgrounds/berlin-pexels-wal.jpg') },
      { id: 'bali',         label: 'Bali',          source: require('../../assets/images/rich/backgrounds/bali-pexels-kephuah.jpg') },
      { id: 'santorini',    label: 'Santorini',     source: require('../../assets/images/rich/backgrounds/santorini-pexels-wolfart.jpg') },
    ],
  },
  {
    id: 'beach',
    label: 'Beaches',
    items: [
      { id: 'beach-1', label: 'Spiaggia', source: require('../../assets/images/rich/backgrounds/beach1-pexels-joshsorenson.jpg') },
      { id: 'beach-2', label: 'Riva',     source: require('../../assets/images/rich/backgrounds/beach2-pexels-pok-rie.jpg') },
      { id: 'beach-3', label: 'Mare',     source: require('../../assets/images/rich/backgrounds/beach3-pexels-ivanna-lebediuk.jpg') },
      { id: 'beach-4', label: 'Tramonto', source: require('../../assets/images/rich/backgrounds/beach4-pexels-asadphoto.jpg') },
      { id: 'beach-5', label: 'Lido',     source: require('../../assets/images/rich/backgrounds/beach5-pexels-dominiquemel.jpg') },
    ],
  },
  {
    id: 'mountain',
    label: 'Mountains',
    items: [
      { id: 'mountain-1', label: 'Vetta',       source: require('../../assets/images/rich/backgrounds/mountain1-pexels-gabriele-battimelli.jpg') },
      { id: 'mountain-2', label: 'Neve',        source: require('../../assets/images/rich/backgrounds/mountain2-pexels-marek-piwnicki.jpg') },
      { id: 'mountain-3', label: 'Sentiero',    source: require('../../assets/images/rich/backgrounds/mountain3-pexels-lureofadventure.jpg') },
      { id: 'mountain-4', label: 'Paesaggio',   source: require('../../assets/images/rich/backgrounds/mountain4-pexels-suissounet.jpg') },
      { id: 'mountain-5', label: 'Alpi',        source: require('../../assets/images/rich/backgrounds/mountain5-pexels-gabriele-battimelli.jpg') },
    ],
  },
  {
    id: 'forest',
    label: 'Nature',
    items: [
      { id: 'forest-1', label: 'Bosco',     source: require('../../assets/images/rich/backgrounds/forest1-pexels-pok-rie.jpg') },
      { id: 'forest-2', label: 'Foresta',   source: require('../../assets/images/rich/backgrounds/forest2-pexels-mak-cezar.jpg') },
      { id: 'forest-3', label: 'Alberi',    source: require('../../assets/images/rich/backgrounds/forest3-pexels-joerg-hartmann.jpg') },
      { id: 'forest-4', label: 'Natura',    source: require('../../assets/images/rich/backgrounds/forest4-pexels-raybilcliff.jpg') },
      { id: 'forest-5', label: 'Parco',     source: require('../../assets/images/rich/backgrounds/forest5-pexels-jordicosta.jpg') },
    ],
  },
  {
    id: 'city',
    label: 'Skylines',
    items: [
      { id: 'city-1', label: 'Skyline',   source: require('../../assets/images/rich/backgrounds/city1-pexels-einfoto-2326807.jpg') },
      { id: 'city-2', label: 'Metropoli', source: require('../../assets/images/rich/backgrounds/city2-pexels-jibarofoto.jpg') },
      { id: 'city-3', label: 'Notte',     source: require('../../assets/images/rich/backgrounds/city3-pexels-maxavans.jpg') },
      { id: 'city-4', label: 'Downtown',  source: require('../../assets/images/rich/backgrounds/city4-pexels-nate.jpg') },
      { id: 'city-5', label: 'Luci',      source: require('../../assets/images/rich/backgrounds/city5-pexels-serjosoza.jpg') },
    ],
  },
  {
    id: 'art',
    label: 'Art',
    items: [
      { id: 'art-1', label: 'Museo',       source: require('../../assets/images/rich/backgrounds/art1-pexels-steve.jpg') },
      { id: 'art-2', label: 'Galleria',    source: require('../../assets/images/rich/backgrounds/art2-pexels-silverkblack.jpg') },
      { id: 'art-3', label: 'Arte',        source: require('../../assets/images/rich/backgrounds/art3-pexels-steve.jpg') },
      { id: 'art-4', label: 'Studio',      source: require('../../assets/images/rich/backgrounds/art4-pexels-cottonbro.jpg') },
      { id: 'art-5', label: 'Scultura',    source: require('../../assets/images/rich/backgrounds/art5-pexels-arantxa-treva.jpg') },
    ],
  },
];
