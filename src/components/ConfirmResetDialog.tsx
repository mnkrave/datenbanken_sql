import { useEffect, useId, useRef } from 'react';

interface ConfirmResetDialogProps {
  open: boolean;
  onClose: (confirmed: boolean) => void;
}

export function ConfirmResetDialog({ open, onClose }: ConfirmResetDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Light-dismiss fallback for browsers without native dialog `closedby="any"` (per dialog guide)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const outside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    let pressedOutside = false;
    const onDown = (e: PointerEvent) => {
      pressedOutside = outside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && outside(e)) {
        dialog.close('');
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, []);

  const handleClose = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const result = dialog.returnValue;
    // Reset returnValue so Esc/light-dismiss never leaks a previous value
    dialog.returnValue = '';
    onClose(result === 'reset');
  };

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      onClose={handleClose}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="dialog-body">
        <h1 id={titleId} className="dialog-title">
          Lernfortschritt zurücksetzen?
        </h1>
        <p className="dialog-text">
          Alle gespeicherten Lösungen, deine Tages-Streak und deine SQL-Entwürfe in diesem Browser
          werden dauerhaft gelöscht.
        </p>
        <form method="dialog" className="dialog-actions">
          <button type="submit" value="cancel" className="btn" autoFocus>
            Abbrechen
          </button>
          <button type="submit" value="reset" className="btn btn-danger">
            Alles zurücksetzen
          </button>
        </form>
      </div>
    </dialog>
  );
}
