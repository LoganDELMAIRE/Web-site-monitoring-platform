import React, { useState, useEffect } from 'react';
import { useMonitoringAuth } from '../contexts/AuthContext';
import styles from '../styles/TokenManager.module.css';
import '../styles/common.css';
import { getTrackingScript } from './SiteDetail';
import 'bootstrap-icons/font/bootstrap-icons.min.css';

const TokenManager = () => {
  const { token: authToken, api: axiosInstance } = useMonitoringAuth();
  const [token, setToken] = useState('');
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (authToken) {
      fetchToken();
    } else {
      setIsLoading(false);
    }
  }, [authToken]);

  const fetchToken = async () => {
    try {
      setError(null);
      const response = await axiosInstance.get('/api/monitoring/token');
      setToken(response.data.token);
      setRetryCount(0);
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        setError('La connexion au serveur a échoué. Tentative de reconnexion...');
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            fetchToken();
          }, 2000 * (retryCount + 1));
        } else {
          setError('Impossible de se connecter au serveur. Veuillez réessayer plus tard.');
        }
      } else {
        setError('Erreur lors de la récupération du token. ' + 
          (error.response?.data?.message || error.message));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewToken = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir générer un nouveau token ? Les sites existants devront être mis à jour avec le nouveau token.')) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosInstance.post('/api/monitoring/token/generate');
      setToken(response.data.token);
      setIsTokenVisible(true);
      setRetryCount(0);
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        setError('La connexion au serveur a échoué lors de la génération du token.');
      } else if (error.response?.status === 401) {
        setError('Vous devez être connecté pour générer un nouveau token');
      } else {
        setError('Erreur lors de la génération du token. ' + 
          (error.response?.data?.message || error.message));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTokenVisibility = () => {
    setIsTokenVisible(!isTokenVisible);
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      const originalError = error;
      setError('Token copié avec succès !');
      setTimeout(() => {
        setError(originalError);
      }, 2000);
    } catch (error) {
      setError('Erreur lors de la copie du token');
    }
  };

  if (!authToken) {
    return null;
  }

  if (isLoading) {
    return <div className={styles.token_manager + styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.token_manager}>
      <div className={styles.token_header}>
        <h2>Token de Monitoring</h2>
        <button 
          className="button button-primary"
          onClick={generateNewToken}
          disabled={isLoading || !authToken}
        >
          Générer un nouveau token
        </button>
      </div>

      <div className={styles.token_display}>
        <div className={styles.token_field}>
          <label>Votre token :</label>
          <div className={styles.token_value}>
            {isTokenVisible ? (
              <code>{token || '(Aucun token généré)'}</code>
            ) : (
              <code>••••••••••••••••••••••••••</code>
            )}
            <button 
              className={styles.visibility_btn}
              onClick={toggleTokenVisibility}
              title={isTokenVisible ? "Masquer le token" : "Afficher le token"}
              disabled={!token}
            >
              {isTokenVisible ? 
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" color="var(--primary-color)" class="bi bi-eye-slash-fill" viewBox="0 0 16 16">
                <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"/>
                <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/>
              </svg>:
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-eye-fill" viewBox="0 0 16 16">
                <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
                <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/>
              </svg> 
            }
            </button>
            <button 
              className={styles.copy_btn}
              onClick={copyToken}
              title="Copier le token"
              disabled={!token}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" color="var(--primary-color)" class="bi bi-clipboard2-fill" viewBox="0 0 16 16">
                <path d="M9.5 0a.5.5 0 0 1 .5.5.5.5 0 0 0 .5.5.5.5 0 0 1 .5.5V2a.5.5 0 0 1-.5.5h-5A.5.5 0 0 1 5 2v-.5a.5.5 0 0 1 .5-.5.5.5 0 0 0 .5-.5.5.5 0 0 1 .5-.5z"/>
                <path d="M3.5 1h.585A1.5 1.5 0 0 0 4 1.5V2a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 12 2v-.5q-.001-.264-.085-.5h.585A1.5 1.5 0 0 1 14 2.5v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-12A1.5 1.5 0 0 1 3.5 1"/>
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className={`${styles.message} ${error.includes('succès') ? styles.success : styles.error}`}>
            {error}
          </div>
        )}

        <div className={styles.token_info}>
          <h3>Instructions d'installation</h3>
          <ol>
            <li>
              <strong>Étape 1 : Autorisation du monitoring</strong>
              <ul>
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                  </svg>
                  Créez un fichier <code>.well-known/monitoring-allowed</code> dans le dossier racine de votre site que vous souhaitez monitorer</li>
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                  </svg>
                  Ajoutez cette ligne dans le fichier :</li>
                <pre onClick={() => navigator.clipboard.writeText(`MONITOR_TOKEN=${isTokenVisible ? token : "votre_token"}`)} style={{cursor: 'pointer'}} title="Cliquer pour copier">MONITOR_TOKEN={isTokenVisible ? token : "votre_token"}</pre>
              </ul>
            </li>
            
            <li>
              <strong>Étape 2 : Configuration du serveur</strong>
              <ul>
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                  </svg>
                  Pour Apache, ajoutez dans votre <code>.htaccess</code> :</li>
                <pre onClick={() => navigator.clipboard.writeText(
                  `<Files ".well-known/monitoring-allowed">
  ForceType text/plain
  Require all granted
</Files>`
                  )} style={{cursor: 'pointer'}} title="Cliquer pour copier">{
                    `<Files ".well-known/monitoring-allowed">
  ForceType text/plain
  Require all granted
</Files>`}
                </pre>
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                  </svg>
                  Pour Nginx : 
                  <ul>
                    <li>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                      </svg>
                      ajoutez dans votre configuration nginx.conf:
                    </li>
                    <pre onClick={() => navigator.clipboard.writeText(
                      `location /.well-known/monitoring-allowed {
        proxy_pass http://logan-portfolio-backend:3002/.well-known/monitoring-allowed;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }`
                      )} style={{cursor: 'pointer'}} title="Cliquer pour copier">{
                        `location /.well-known/monitoring-allowed {
        proxy_pass http://logan-portfolio-backend:3002/.well-known/monitoring-allowed;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }`}
                    </pre>
                    <li>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                      </svg>
                      Ajoutez dans votre serveur backend, dans la constante initializeServer :
                    </li>
                    <pre onClick={() => navigator.clipboard.writeText(
                      `app.get('/.well-known/monitoring-allowed', async (req, res) => {
      try {
        const filePath = path.join(__dirname, '.well-known', 'monitoring-allowed');
        const content = await fs.readFile(filePath, 'utf8');
        res.type('text/plain').send(content);
      } catch (error) {
        logger.error('Erreur lors de la lecture du fichier monitoring-allowed:', error);
        res.status(404).send('Not found');
      }
    });`
                    )} style={{cursor: 'pointer'}} title="Cliquer pour copier">{
                      `app.get('/.well-known/monitoring-allowed', async (req, res) => {
      try {
        const filePath = path.join(__dirname, '.well-known', 'monitoring-allowed');
        const content = await fs.readFile(filePath, 'utf8');
        res.type('text/plain').send(content);
      } catch (error) {
        logger.error('Erreur lors de la lecture du fichier monitoring-allowed:', error);
        res.status(404).send('Not found');
      }
    });`
                    }</pre>
                  </ul>
                </li>
              </ul>
            </li>
                  
            <li>
              <strong>Étape 3 : Vérification</strong>
              <ul>
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                  </svg>
                  Vérifiez que le fichier token est accessible à :</li>
                <pre>https://votre-site.com/.well-known/monitoring-allowed</pre>
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                  </svg>
                  Le contenu doit afficher exactement : <code>MONITOR_TOKEN={isTokenVisible ? token : "votre_token"}</code></li>
              </ul>
            </li>

            <li>
              <strong>Étape 4 : Ajout du site</strong>
              <ul>
                <li><a href="#site-info" style={{color: '#000000', textDecoration: 'none'}}>Ajouter votre site via le formulaire ci dessous</a></li>
              </ul>
            </li>

            <li>
              <strong>Étape 5 : Installation du script de tracking</strong>
              <ul>
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                  </svg>
                  Une fois votre site ajouté, allez sur la page de monitoring du site, vous y trouverez le script de tracking personnalisé pour votre site</li>
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                  </svg>
                  Copiez le script et ajoutez-le dans la section <code>&lt;body&gt;</code> de votre site</li>
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" color="var(--primary-color)" fill="currentColor" class="bi bi-dot" viewBox="0 0 16 16">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
                  </svg>
                  Vous aurez aussi un boutton de vérification du script, il vous permettra de vérifier si le script est bien installé</li>
              </ul>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TokenManager; 