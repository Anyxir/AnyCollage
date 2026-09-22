type PhotoUploaderProps = {
  onBrowse: () => void;
};

export function PhotoUploader({ onBrowse }: PhotoUploaderProps) {
  return (
    <div className="uploader">
      <img className="mark-float" src="/logo.png" alt="" width="72" height="72" />
      <p className="uploader-title">Glissez-déposez vos photos ici</p>
      <p>JPG, JPEG, PNG, WEBP ou HEIC. Tout reste sur cet ordinateur.</p>
      <button type="button" className="btn btn-accent" onClick={onBrowse}>
        Importer des photos
      </button>
    </div>
  );
}
