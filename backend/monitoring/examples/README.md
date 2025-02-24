# Guide d'installation du monitoring

## 1. Configuration du fichier d'autorisation

### Pour Apache

1. Créez le dossier `.well-known` à la racine de votre site :
```bash
mkdir -p /chemin/vers/votre/site/.well-known
```

2. Créez le fichier `monitoring-allowed` :
```bash
touch /chemin/vers/votre/site/.well-known/monitoring-allowed
```

3. Ajoutez cette configuration dans votre `.htaccess` :
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^\.well-known/ - [L]
</IfModule>

<Files "monitoring-allowed">
    Order allow,deny
    Allow from all
    Require all granted
</Files>
```

### Pour Nginx

1. Créez le dossier et le fichier comme pour Apache

2. Ajoutez cette configuration dans votre configuration Nginx :
```nginx
location /.well-known/monitoring-allowed {
    allow all;
    try_files $uri =404;
}
```

## 2. Configuration du token

1. Copiez votre token depuis le tableau de bord de monitoring

2. Éditez le fichier `/.well-known/monitoring-allowed` :
```bash
echo "MONITOR_TOKEN=votre_token_de_monitoring" > /chemin/vers/votre/site/.well-known/monitoring-allowed
```

## 3. Vérification

1. Vérifiez que le fichier est accessible via :
```
https://votre-site.com/.well-known/monitoring-allowed
```

2. Le contenu doit être :
```
MONITOR_TOKEN=votre_token_de_monitoring
```

## 4. Sécurité

- Ne partagez jamais votre token de monitoring
- Le fichier doit être accessible publiquement mais ne contenir que le token
- Utilisez HTTPS pour sécuriser l'accès au fichier
- Vérifiez régulièrement les logs d'accès au fichier

## 5. Dépannage

Si le monitoring ne fonctionne pas :

1. Vérifiez que le fichier est accessible publiquement
2. Vérifiez que le token est correct
3. Vérifiez les permissions du fichier (644) et du dossier (755)
4. Vérifiez les logs du serveur web pour les erreurs d'accès 