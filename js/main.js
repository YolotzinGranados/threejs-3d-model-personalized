import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const manager = new THREE.LoadingManager();

let camera, scene, renderer, stats, object, loader, guiMorphsFolder;
let mixer;

const clock = new THREE.Clock();

const params = {
    asset: 'Samba Dancing'
};

const assets = [
    'Samba Dancing',
    'morph_test','espada',
    
];
const cubes = [];

init();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(100, 200, 300);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    scene.fog = new THREE.Fog(0xa0a0a0, 200, 1000);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 5);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    scene.add(dirLight);

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);
    const geometry = new THREE.BoxGeometry(50, 50, 50); // ancho, alto, profundidad
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // o MeshPhongMaterial
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 25, 0); // Posición en el mundo

cube.castShadow = true;
cube.receiveShadow = true;

scene.add(cube);


    loader = new FBXLoader(manager);
    loadAsset(params.asset);

   renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;

renderer.setAnimationLoop(animate); // ✅ ESTA ES LA LÍNEA CLAVE

container.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0);
    controls.update();

    window.addEventListener('resize', onWindowResize);

    stats = new Stats();
    container.appendChild(stats.dom);

    const gui = new GUI();
    gui.add(params, 'asset', assets).onChange(function (value) {
        loadAsset(value);
    });

    guiMorphsFolder = gui.addFolder('Morphs').hide();
}

function loadAsset(asset) {
    if (object) {
        // Limpiar los materiales y geometrías del objeto anterior
        object.traverse(function (child) {
            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(material => {
                    if (material.map) material.map.dispose();
                    material.dispose();
                });
            }
            if (child.geometry) child.geometry.dispose();
        });

        scene.remove(object);
    }

    loader.load(
        './models/fbx/' + asset + '.fbx',
        function (group) {
            object = group;

            if (object.animations && object.animations.length) {
                mixer = new THREE.AnimationMixer(object);
                const action = mixer.clipAction(object.animations[0]);
                action.play();
            } else {
                mixer = null;
            }

            guiMorphsFolder.children.forEach((child) => child.destroy());
            guiMorphsFolder.hide();

            object.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.morphTargetDictionary) {
                        guiMorphsFolder.show();
                        const meshFolder = guiMorphsFolder.addFolder(child.name || child.uuid);
                        Object.keys(child.morphTargetDictionary).forEach((key) => {
                            meshFolder.add(child.morphTargetInfluences, child.morphTargetDictionary[key], 0, 1, 0.01);
                        });
                    }
                }
            });

            scene.add(object);
            // Borra cubos anteriores si hay
cubes.forEach(cube => {
    scene.remove(cube);
    cube.geometry.dispose();
    cube.material.dispose();
});
cubes.length = 0;

createRandomCubes(15);

            
        },
        undefined, // Función de progreso
        function (error) { // Manejar error
            console.error('Error cargando el modelo: ', error);
        }
    );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}
function createRandomCubes(num, minDistFromCharacter = 100) {
    const cubeSize = 50;
    const positions = [];

    for (let i = 0; i < num; i++) {
        let position;
        let attempts = 0;

        do {
            // Posición aleatoria dentro de un rango
            position = new THREE.Vector3(
                (Math.random() - 0.5) * 800,
                cubeSize / 2,
                (Math.random() - 0.5) * 800
            );
            attempts++;

            // Comprobar distancia mínima entre cubos
            let tooClose = positions.some(pos => pos.distanceTo(position) < cubeSize * 2);

            // También comprobar distancia del personaje (suponemos en 0,0,0 o posición del objeto)
            const characterPos = object ? object.position : new THREE.Vector3(0, 0, 0);
            if (position.distanceTo(characterPos) < minDistFromCharacter) tooClose = true;

            if (attempts > 100) break; // evitar bucle infinito

        } while (tooClose);

        positions.push(position);

        // Crear cubo
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.copy(position);
        cube.castShadow = true;
        cube.receiveShadow = true;

        // Añadir velocidad de rotación aleatoria
        cube.userData.rotationSpeed = new THREE.Vector3(
            (Math.random() * 0.02) + 0.01,
            (Math.random() * 0.02) + 0.01,
            (Math.random() * 0.02) + 0.01
        );

        scene.add(cube);
        cubes.push(cube);
    }
}


function animate() {
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    // Rotar cubos
    cubes.forEach(cube => {
        cube.rotation.x += cube.userData.rotationSpeed.x;
        cube.rotation.y += cube.userData.rotationSpeed.y;
        cube.rotation.z += cube.userData.rotationSpeed.z;
    });

    renderer.render(scene, camera);

    stats.update();
}

