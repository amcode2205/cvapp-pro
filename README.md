# CVApp Pro

**by Alejandro Montes**

Aplicación web para crear un currículum interactivo, previsualizarlo/descargarlo en PDF y ver vacantes sugeridas según el perfil.

Stack: HTML + CSS + JavaScript (módulos ES) · Supabase Auth/DB · Vercel

## URL

https://cv-studio-dw2.vercel.app

## Módulos

- Login: Google, Microsoft, correo OTP, invitado
- Perfil profesional
- Editor de CV + vista previa
- Vista PDF (previsualizar / descargar)
- Vacantes por afinidad

## Diseño

Interfaz alineada a principios de [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/design-principles): claridad tipográfica, deferencia al contenido, profundidad sutil (blur/nav) y feedback inmediato.

## Configuración Supabase

Proyecto: `cv-studio` (`ptajhednlrmgdlnslplt`)

1. **URL Configuration:** Site URL = `https://cv-studio-dw2.vercel.app` (+ redirects)
2. **Google / Azure:** Providers con Client ID/Secret
3. **Email OTP:** plantilla Magic Link con `{{ .Token }}`
4. **Anonymous (opcional):** Allow anonymous sign-ins — si no, el invitado usa modo local

## Local

```bash
python3 -m http.server 5500
```

## Redeploy

```bash
npx vercel deploy --prod
```

Esquema SQL: `sql/001_schema.sql`
