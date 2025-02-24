# Service de Monitoring Sandbox

Ce service permet de surveiller la disponibilité et les performances de vos sites web.

## Installation

1. Clonez le dépôt :
```bash
git clone [url-du-repo]
cd sandbox/backend/monitoring
```

2. Installez les dépendances :
```bash
npm install
```

3. Exécutez le script de configuration :
```bash
node setup.js
```

Ce script va :
- Créer les répertoires nécessaires
- Générer un token unique pour votre installation
- Créer le fichier de configuration

## Configuration des sites à monitorer

Pour chaque site que vous souhaitez monitorer, vous devez :

1. Créer un fichier `.well-known/monitoring-allowed` sur le site
2. Ajouter votre token de monitoring dans ce fichier
3. Configurer le serveur web pour autoriser l'accès au fichier

Consultez le dossier `examples` pour :
- Un exemple de fichier `monitoring-allowed`
- Des instructions détaillées d'installation
- Des exemples de configuration serveur

## Sécurité

Le système utilise plusieurs niveaux de sécurité :

1. **Token unique** :
   - Chaque installation génère son propre token
   - Le token est vérifié à chaque requête
   - Les sites doivent explicitement autoriser le monitoring

2. **Vérification bidirectionnelle** :
   - Le service vérifie le token du site
   - Le site vérifie le token du service

3. **Protection des domaines** :
   - Liste blanche des domaines autorisés
   - Vérification des protocoles (HTTP/HTTPS)

## Utilisation

1. Générez un nouveau token (si nécessaire) :
```bash
node utils/tokenGenerator.js
```

2. Ajoutez le token sur les sites à monitorer :
```
MONITOR_TOKEN=votre_token_ici
```

3. Ajoutez vos sites depuis l'interface web du monitoring

## Personnalisation

Vous pouvez personnaliser :
- La liste des domaines autorisés dans `middleware/siteAuth.js`
- Les intervalles de vérification dans `config/monitor.config.js`
- Les paramètres de notification dans le fichier `monitoring-allowed`

## Support

Pour plus d'informations :
- Consultez le dossier `examples`
- Lisez la documentation dans `docs`
- Contactez le support technique 