import * as Location from 'expo-location';

type PincodeOffice = {
  Name?: string;
  District?: string;
  State?: string;
  Block?: string;
};

type PincodeResponse = {
  Status?: string;
  Message?: string;
  PostOffice?: PincodeOffice[];
};

export async function lookupLocationByPincode(pincode: string): Promise<string> {
  const digits = pincode.replace(/\D/g, '');
  if (digits.length !== 6) {
    throw new Error('Enter a valid 6-digit pincode');
  }

  const response = await fetch(`https://api.postalpincode.in/pincode/${digits}`);
  const data = (await response.json()) as PincodeResponse[];

  const result = data[0];
  if (!response.ok || result?.Status !== 'Success' || !result.PostOffice?.length) {
    throw new Error(result?.Message ?? 'Pincode not found. Check and try again.');
  }

  const office = result.PostOffice[0];
  const parts = [office.Name, office.District, office.State]
    .filter((part) => part && part.trim().length > 0)
    .map((part) => part!.trim());

  const unique = [...new Set(parts)];
  return `${unique.join(', ')} - ${digits}`;
}

export async function detectDeliveryLocation(): Promise<string> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Allow location access to detect your delivery address.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const places = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });

  const place = places[0];
  if (!place) {
    return 'Current location';
  }

  const parts = [place.name, place.district, place.city, place.subregion, place.region]
    .filter((part) => part && part.trim().length > 0)
    .map((part) => part!.trim());

  const unique = [...new Set(parts)];
  return unique.slice(0, 3).join(', ') || 'Current location';
}
