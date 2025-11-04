# Aprende Acordes de Piano 🎹

Una aplicación web interactiva para aprender acordes de piano de forma visual y sencilla.

## Características

- Piano visual interactivo con teclas blancas y negras
- Aprende acordes mayores, menores, disminuidos y aumentados
- Selecciona cualquier nota como base (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- Las teclas se iluminan mostrando qué tocar para cada acorde
- Información detallada de los intervalos de cada acorde

## Cómo usar

1. Abre `index.html` en tu navegador
2. Selecciona una nota base (por ejemplo, C, D, E, etc.)
3. Haz click en un tipo de acorde (Mayor, Menor, Disminuido, Aumentado)
4. Las teclas del piano se iluminarán mostrando qué notas tocar
5. Usa el botón "Limpiar" para reiniciar

## Tipos de acordes incluidos

- **Mayor**: Fundamental + 3ª Mayor + 5ª Justa
- **Menor**: Fundamental + 3ª Menor + 5ª Justa
- **Disminuido**: Fundamental + 3ª Menor + 5ª Disminuida
- **Aumentado**: Fundamental + 3ª Mayor + 5ª Aumentada

## Tecnologías

- HTML5
- CSS3 (con gradientes y animaciones)
- JavaScript vanilla (sin dependencias)

## Demo

Simplemente abre el archivo `index.html` en cualquier navegador moderno.

## Despliegue en GitHub Pages

Este proyecto incluye un workflow de GitHub Actions que despliega automáticamente la aplicación en GitHub Pages.

### Configuración inicial:

1. **Mergea el Pull Request a la rama main/master**
   ```bash
   # O desde la interfaz de GitHub, mergea el PR
   ```

2. **Habilita GitHub Pages en tu repositorio:**
   - Ve a Settings > Pages
   - En "Source", selecciona "GitHub Actions"
   - Guarda los cambios

3. **El workflow se ejecutará automáticamente** cada vez que hagas push a main/master

4. **Accede a tu aplicación en:**
   ```
   https://TuUsuario.github.io/learn-piano/
   ```

### Workflow automático

El archivo `.github/workflows/deploy.yml` se encarga de:
- ✅ Detectar cambios en main/master
- ✅ Construir y desplegar automáticamente
- ✅ Actualizar GitHub Pages
- ✅ Soporte para despliegue manual (workflow_dispatch)

¡No necesitas hacer nada más! Cada commit a main/master actualizará automáticamente tu sitio.