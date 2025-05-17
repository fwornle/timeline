import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import type { Preferences } from '../services/storage';
import { usePreferences } from '../context/PreferencesContext';

interface PreferencesModalProps {
  show: boolean;
  onClose: () => void;
  onRepoUrlChange?: (url: string) => void;
}

const PreferencesModal: React.FC<PreferencesModalProps> = ({ show, onClose, onRepoUrlChange }) => {
  const { preferences, setPreferences, refreshPreferences } = usePreferences();
  const [prefs, setPrefs] = useState<Preferences>({});
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [repoUrl, setRepoUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (show) {
      setPrefs(preferences);
      setRepoUrl(preferences.repoUrl || '');
      setUsername(preferences.username || '');
      setPassword(''); // Don't populate password for security
      setSuccess(false);
      setErrors({});
    }
  }, [show, preferences]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPrefs(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const errs: { [k: string]: string } = {};
    if (repoUrl && !repoUrl.match(/^(https?:\/\/|git@|ssh:\/\/).+\.git$/)) {
      errs.repoUrl = 'Repository URL should end with .git and start with http://, https://, git@, or ssh://';
    }
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Update preferences with repo info
    const updatedPrefs = {
      ...prefs,
      repoUrl,
      username: username || undefined
    };

    setPreferences(updatedPrefs);

    // Store credentials if provided for HTTPS URLs
    if (repoUrl.startsWith('http') && username && password) {
      const credentials = btoa(`${username}:${password}`);
      localStorage.setItem('git-credentials', credentials);
    }

    // Notify parent component about repo URL change
    // Always trigger a refresh when saving, even if the URL hasn't changed
    if (onRepoUrlChange && repoUrl) {
      onRepoUrlChange(repoUrl);
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 1500);
    refreshPreferences();
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Repository Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Git Repository URL</Form.Label>
            <Form.Control
              type="text"
              placeholder="https://github.com/username/repo.git or git@github.com:username/repo.git"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              isInvalid={!!errors.repoUrl}
            />
            <Form.Control.Feedback type="invalid">{errors.repoUrl}</Form.Control.Feedback>
            <Form.Text muted>
              Enter the URL of the Git repository you want to visualize.
              Both HTTPS and SSH formats are supported.
            </Form.Text>
          </Form.Group>

          {repoUrl && repoUrl.startsWith('http') && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Username (for HTTPS repositories)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Git username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Password/Token (for HTTPS repositories)</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Git password or personal access token"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Form.Text muted>
                  For GitHub, use a personal access token instead of your password.
                  Your credentials are stored securely in your browser.
                </Form.Text>
              </Form.Group>
            </>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Theme</Form.Label>
            <Form.Select
              name="theme"
              value={prefs.theme || 'system'}
              onChange={handleChange}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Animation Speed</Form.Label>
            <div className="d-flex align-items-center">
              <Form.Range
                name="animationSpeed"
                min="0.1"
                max="5"
                step="0.1"
                value={prefs.animationSpeed || 1}
                onChange={handleChange}
                className="flex-grow-1 me-2"
              />
              <span className="text-muted">{prefs.animationSpeed || 1}x</span>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="autoDrift"
              name="autoDrift"
              label="Auto-drift (automatically scroll through timeline)"
              checked={!!prefs.autoDrift}
              onChange={(e) => setPrefs(prev => ({ ...prev, autoDrift: e.target.checked }))}
            />
          </Form.Group>
        </Form>

        {success && <Alert variant="success" className="mt-3">Settings saved!</Alert>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PreferencesModal;