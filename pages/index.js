import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // GitHub config
  const repoConfig = {
    owner: process.env.NEXT_PUBLIC_GITHUB_OWNER,
    repo: process.env.NEXT_PUBLIC_GITHUB_REPO,
    path: process.env.NEXT_PUBLIC_GITHUB_FILE_PATH || 'data.json',
    branch: process.env.NEXT_PUBLIC_GITHUB_BRANCH || 'main',
    token: process.env.NEXT_PUBLIC_GITHUB_TOKEN,
  };

  // Fetch data from GitHub
  const fetchData = async () => {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        { headers: { Authorization: `token ${repoConfig.token}` } }
      );
      const content = JSON.parse(atob(response.data.content));
      setItems(content.items || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setItems([]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setMessage('');

    try {
      // Get current file
      const currentFile = await axios.get(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        { headers: { Authorization: `token ${repoConfig.token}` } }
      );

      // Prepare new content
      const currentContent = JSON.parse(atob(currentFile.data.content));
      const newItem = {
        title: inputValue,
        steps: [{ text: 'Initial step', link: '' }],
        info: '',
        createdAt: new Date().toISOString()
      };
      
      const newContent = {
        ...currentContent,
        items: [...(currentContent.items || []), newItem]
      };

      // Update file
      await axios.put(
        `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${repoConfig.path}`,
        {
          message: `Add new item: ${inputValue.substring(0, 20)}...`,
          content: btoa(JSON.stringify(newContent, null, 2)),
          sha: currentFile.data.sha,
          branch: repoConfig.branch,
        },
        { headers: { Authorization: `token ${repoConfig.token}` } }
      );

      setInputValue('');
      setMessage('✅ Item added successfully!');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      setMessage(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle step modifications
  const handleStepChange = (itemIndex, stepIndex, field, value) => {
    const updatedItems = [...items];
    updatedItems[itemIndex].steps[stepIndex][field] = value;
    setItems(updatedItems);
  };

  const addStep = (itemIndex) => {
    const updatedItems = [...items];
    updatedItems[itemIndex].steps.push({ text: '', link: '' });
    setItems(updatedItems);
  };

  const removeStep = (itemIndex, stepIndex) => {
    if (items[itemIndex].steps.length <= 1) return;
    const updatedItems = [...items];
    updatedItems[itemIndex].steps.splice(stepIndex, 1);
    setItems(updatedItems);
  };

  // Initial data fetch
  useEffect(() => { fetchData(); }, []);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1>Public Airdrop Collection</h1>
      </header>

      <div className={styles.mainContent}>
        {/* Left Side - Editor */}
        <div className={styles.editorSection}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <h2>Add New Airdrop</h2>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Airdrop title..."
              className={styles.input}
              required
            />
            <button 
              type="submit" 
              className={styles.button}
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Airdrop'}
            </button>
          </form>
          {message && (
            <p className={message.startsWith('✅') ? styles.successMessage : styles.errorMessage}>
              {message}
            </p>
          )}
        </div>

        {/* Right Side - Display */}
        <div className={styles.displaySection}>
          <h2>Available Airdrops</h2>
          <div className={styles.itemsContainer}>
            {items.length > 0 ? (
              items.map((item, itemIndex) => (
                <div key={itemIndex} className={styles.itemBlock}>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                  
                  <div className={styles.stepsContainer}>
                    <h4>Steps:</h4>
                    {item.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className={styles.step}>
                        <input
                          type="text"
                          value={step.text}
                          onChange={(e) => handleStepChange(itemIndex, stepIndex, 'text', e.target.value)}
                          placeholder="Step description"
                          className={styles.stepInput}
                        />
                        <input
                          type="url"
                          value={step.link}
                          onChange={(e) => handleStepChange(itemIndex, stepIndex, 'link', e.target.value)}
                          placeholder="Step link (optional)"
                          className={styles.stepInput}
                        />
                        <button
                          type="button"
                          onClick={() => removeStep(itemIndex, stepIndex)}
                          disabled={item.steps.length <= 1}
                          className={styles.stepButton}
                        >
                          −
                        </button>
                        {stepIndex === item.steps.length - 1 && (
                          <button
                            type="button"
                            onClick={() => addStep(itemIndex)}
                            className={styles.stepButton}
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className={styles.additionalInfo}>
                    <h4>Additional Info:</h4>
                    <textarea
                      value={item.info}
                      onChange={(e) => {
                        const updatedItems = [...items];
                        updatedItems[itemIndex].info = e.target.value;
                        setItems(updatedItems);
                      }}
                      placeholder="Any additional information..."
                      className={styles.infoTextarea}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.noItems}>No airdrops available. Add one using the form.</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Made with ♥️ by Alvin</p>
        <p>© 2025 all rights reserved.</p>
      </footer>
    </div>
  );
}