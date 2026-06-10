import ImageUrlField from './ImageUrlField';
import '../components/shared.css';

export const MIN_PRODUCT_IMAGES = 2;
export const MAX_PRODUCT_IMAGES = 5;

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  error?: string | null;
};

export default function ProductImagesField({ images, onChange, error }: Props) {
  const updateImage = (index: number, value: string) => {
    const next = [...images];
    next[index] = value;
    onChange(next);
  };

  const addImage = () => {
    if (images.length >= MAX_PRODUCT_IMAGES) return;
    onChange([...images, '']);
  };

  const removeImage = (index: number) => {
    if (images.length <= MIN_PRODUCT_IMAGES) return;
    onChange(images.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="full product-images-field">
      <div className="product-images-header">
        <strong>Product Images</strong>
        <small>
          {images.length}/{MAX_PRODUCT_IMAGES} · minimum {MIN_PRODUCT_IMAGES}
        </small>
      </div>

      {images.map((image, index) => (
        <div key={`product-image-${index}`} className="product-image-row">
          <ImageUrlField
            label={`Image ${index + 1}`}
            value={image}
            onChange={(value) => updateImage(index, value)}
            previewSize={72}
          />
          {images.length > MIN_PRODUCT_IMAGES ? (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => removeImage(index)}>
              Remove
            </button>
          ) : null}
        </div>
      ))}

      {images.length < MAX_PRODUCT_IMAGES ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={addImage}>
          + Add Image
        </button>
      ) : null}

      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
