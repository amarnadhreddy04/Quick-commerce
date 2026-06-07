import '../components/shared.css';

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  previewSize?: number;
};

export default function ImageUrlField({
  label = 'Image URL',
  value,
  onChange,
  placeholder = 'https://images.unsplash.com/...',
  previewSize = 96,
}: Props) {
  const showPreview = value.startsWith('http');

  return (
    <label className="full image-url-field">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <small className="field-hint">Paste a direct image link (JPG, PNG, or WebP).</small>
      {showPreview ? (
        <div className="image-preview-wrap">
          <img
            src={value}
            alt="Preview"
            className="image-preview"
            style={{ width: previewSize, height: previewSize }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : null}
    </label>
  );
}
