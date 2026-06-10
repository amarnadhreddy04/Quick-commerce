import { useEffect, useState } from 'react';

import { api } from '../lib/api';

type ServicePincode = {
  pincode: string;
  label: string;
  active: boolean;
};

type Props = {
  selected: string[];
  onChange: (pincodes: string[]) => void;
};

export default function PincodeAvailabilityField({ selected, onChange }: Props) {
  const [pincodes, setPincodes] = useState<ServicePincode[]>([]);
  const [loading, setLoading] = useState(true);
  const allLocations = selected.length === 0;

  useEffect(() => {
    api
      .getPincodes()
      .then((response) => setPincodes((response.pincodes as ServicePincode[]).filter((item) => item.active)))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const togglePincode = (pincode: string) => {
    if (selected.includes(pincode)) {
      onChange(selected.filter((item) => item !== pincode));
      return;
    }
    onChange([...selected, pincode]);
  };

  return (
    <div className="full pincode-field">
      <span className="field-label">Available locations</span>
      <label className="pincode-all">
        <input
          type="checkbox"
          checked={allLocations}
          onChange={(event) => {
            if (event.target.checked) onChange([]);
          }}
        />{' '}
        All delivery locations
      </label>
      {loading ? <p className="muted">Loading locations...</p> : null}
      {!loading && !allLocations ? (
        <div className="pincode-grid">
          {pincodes.map((item) => (
            <label key={item.pincode} className="pincode-option">
              <input
                type="checkbox"
                checked={selected.includes(item.pincode)}
                onChange={() => togglePincode(item.pincode)}
              />
              <span>
                <strong>{item.label}</strong>
                <small>{item.pincode}</small>
              </span>
            </label>
          ))}
        </div>
      ) : null}
      {!allLocations && selected.length === 0 ? (
        <p className="field-error">Select at least one location or choose all locations.</p>
      ) : null}
    </div>
  );
}
