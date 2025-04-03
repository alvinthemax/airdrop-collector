import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState([{ text: '', link: '' }]);
  const [info, setInfo] = useState('');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null); // Track which item is being edited

  // GitHub config
  const repoConfig = {
    owner: process.env.NEXT_PUBLIC_GITHUB_OWNER,
    repo: process.env.NEXT_PUBLIC_GITHUB_REPO,
    path: process.env.NEXT_PUBLIC_GITHUB_FILE_PATH || 'data.json',
    branch: process.env.NEXT_PUBLIC_GITHUB_BRANCH || 'main',
    token: process.env.NEXT_PUBLIC_GITHUB_TOKEN,
  };

  // Fetch data with proper error handling
  const fetchData = async () => {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        {
          headers: {
            Authorization: `token ${repoConfig.token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      // Decode and verify data structure
      const content = JSON.parse(atob(response.data.content));
      if (!content.items) {
        console.warn('No items array found, initializing new structure');
        content.items = [];
      }
      
      setItems(content.items);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setMessage(`Failed to load data: ${error.response?.status === 404 
        ? 'File not found' 
        : error.message}`);
      setItems([]);
    }
  };

  // Handle step modifications
  const handleStepChange = (stepIndex, field, value) => {
    const updatedSteps = steps.map((step, idx) => 
      idx === stepIndex ? { ...step, [field]: value } : step
    );
    setSteps(updatedSteps);
  };

  const addStep = () => {
    setSteps([...steps, { text: '', link: '' }]);
  };

  const removeStep = (stepIndex) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, idx) => idx !== stepIndex));
  };

  // Handle edit button click
  const handleEdit = (item) => {
    setEditingId(item.createdAt); // Use createdAt as unique identifier
    setTitle(item.title);
    setSteps(item.steps.length > 0 ? item.steps : [{ text: '', link: '' }]);
    setInfo(item.info || '');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
  };

  // Submit handler (for both add and edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setMessage('❌ Title is required');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Get current file
      const currentFile = await axios.get(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        {
          headers: {
            Authorization: `token ${repoConfig.token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      // Prepare new content
      const currentContent = JSON.parse(atob(currentFile.data.content)) || { items: [] };
      const newItem = {
        title,
        steps: steps.filter(step => step.text.trim() !== ''),
        info,
        createdAt: editingId || new Date().toISOString() // Keep original ID if editing
      };

      // If editing, remove the old version
      const updatedItems = editingId
        ? currentContent.items.filter(item => item.createdAt !== editingId)
        : currentContent.items;

      const newContent = {
        ...currentContent,
        items: [...updatedItems, newItem]
      };

      // Update file
      await axios.put(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        {
          message: editingId 
            ? `Updated airdrop: ${title.substring(0, 20)}`
            : `Added airdrop: ${title.substring(0, 20)}`,
          content: btoa(JSON.stringify(newContent, null, 2)),
          sha: currentFile.data.sha,
          branch: repoConfig.branch
        },
        {
          headers: {
            Authorization: `token ${repoConfig.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          }
        }
      );

      // Reset form and refresh data
      setTitle('');
      setSteps([{ text: '', link: '' }]);
      setInfo('');
      setEditingId(null);
      await fetchData();
      setMessage(editingId ? '✅ Airdrop updated successfully!' : '✅ Airdrop added successfully!');
    } catch (error) {
      console.error('Submission error:', error);
      setMessage(`❌ Failed to ${editingId ? 'update' : 'add'}: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel edit and reset form
  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setSteps([{ text: '', link: '' }]);
    setInfo('');
    setMessage('');
  };

  // Initial data load
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Public Airdrop Collection</h1>
      </header>

      <div className={styles.mainContent}>
        {/* Editor Section */}
        <div className={styles.editorSection}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <h2>{editingId ? 'Edit Airdrop' : 'Add New Airdrop'}</h2>
            
            <div className={styles.formGroup}>
              <label>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Airdrop title"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Steps</label>
              {steps.map((step, index) => (
                <div key={index} className={styles.stepRow}>
                  <input
                    type="text"
                    value={step.text}
                    onChange={(e) => handleStepChange(index, 'text', e.target.value)}
                    placeholder="Step description"
                    className={styles.input}
                    required
                  />
                  <input
                    type="url"
                    value={step.link}
                    onChange={(e) => handleStepChange(index, 'link', e.target.value)}
                    placeholder="Link (optional)"
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    disabled={steps.length <= 1}
                    className={styles.stepButton}
                  >
                    −
                  </button>
                  {index === steps.length - 1 && (
                    <button
                      type="button"
                      onClick={addStep}
                      className={styles.stepButton}
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.formGroup}>
              <label>Additional Info</label>
              <textarea
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                placeholder="Any additional information..."
                className={styles.textarea}
                rows={3}
              />
            </div>

            <div className={styles.buttonGroup}>
              <button 
                type="submit" 
                className={styles.button}
                disabled={isLoading}
              >
                {isLoading ? 'Submitting...' : editingId ? 'Update Airdrop' : 'Add Airdrop'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className={`${styles.button} ${styles.cancelButton}`}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {message && (
            <div className={message.startsWith('✅') ? styles.successMessage : styles.errorMessage}>
              {message}
            </div>
          )}
        </div>

        {/* Display Section */}
        <div className={styles.displaySection}>
          <h2>Available Airdrops ({items.length})</h2>
          
          {items.length > 0 ? (
            <div className={styles.itemsContainer}>
              {items.map((item, index) => (
                <div key={index} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    <button 
                      onClick={() => handleEdit(item)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                  </div>
                  
                  {item.steps?.length > 0 && (
                    <div className={styles.stepsContainer}>
                      <h4>Steps:</h4>
                      <ol>
                        {item.steps.map((step, i) => (
                          <li key={i} className={styles.step}>
                            {step.text}
                            {step.link && (
                              <a 
                                href={step.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={styles.stepLink}
                              >
                                (Link)
                              </a>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {item.info && (
                    <div className={styles.additionalInfo}>
                      <h4>Notes:</h4>
                      <p>{item.info}</p>
                    </div>
                  )}

                  <div className={styles.itemMeta}>
                    <small>Added: {new Date(item.createdAt).toLocaleDateString()}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noData}>
              <p>No airdrops available yet</p>
              <p>Add your first airdrop using the form</p>
            </div>
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <p>Made with ♥️ by Alvin</p>
        <p>© 2025 All rights reserved</p>
      </footer>
    </div>
  );
}
