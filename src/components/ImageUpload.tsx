import React, { useRef, useState } from 'react';

const MAX_SIZE_MB = 10;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

interface ImageUploadProps {
  onImageSelected?: (file: File, dataUrl: string) => void;
  onReset?: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, onReset }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only JPG and PNG images are supported.';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File size must be less than ${MAX_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    const validationError = validateFile(selected);
    if (validationError) {
      setError(validationError);
      setPreview(null);
      return;
    }
    setError(null);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLoading(false);
      setPreview(e.target?.result as string);
      if (onImageSelected) onImageSelected(selected, e.target?.result as string);
    };
    reader.onerror = () => {
      setLoading(false);
      setError('Failed to read file.');
    };
    reader.readAsDataURL(selected);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleReset = () => {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    if (onReset) onReset();
  };

  return (
    <div className="my-4">
      <div
        className={`border rounded p-4 text-center position-relative ${dragActive ? 'bg-light border-primary' : 'bg-white'}`}
        style={{ cursor: 'pointer', minHeight: 180 }}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        {!preview && !loading && (
          <>
            <div className="mb-2">
              <i className="bi bi-cloud-arrow-up" style={{ fontSize: 48, color: '#0d6efd' }} />
            </div>
            <div className="fw-bold">Drag & drop a whiteboard photo here, or click to select</div>
            <div className="text-muted small">JPG, PNG, max {MAX_SIZE_MB}MB</div>
          </>
        )}
        {loading && <div className="my-3">Loading...</div>}
        {preview && (
          <div>
            <img src={preview} alt="Preview" className="img-fluid rounded mb-2" style={{ maxHeight: 200 }} />
            <div>
              <button className="btn btn-outline-secondary btn-sm" onClick={e => { e.stopPropagation(); handleReset(); }}>Reset</button>
            </div>
          </div>
        )}
        {error && <div className="alert alert-danger mt-3 mb-0 py-2 px-3 small position-absolute w-100 start-0" style={{ bottom: -40 }}>{error}</div>}
      </div>
    </div>
  );
};

export default ImageUpload; 