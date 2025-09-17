import Alpine from "alpinejs";
import CTFd from "./index";
import * as THREE from 'three';

window.Alpine = Alpine;
window.CTFd = CTFd;

// 3D Scoreboard Manager
class Scoreboard3D {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.challenges = [];
    this.teams = [];
    this.challengeNodes = new Map();
    this.teamNodes = new Map();
    this.animationId = null;
    this.autoRotate = true;
    this.isInitialized = false;
    
    // Animation and effects
    this.clock = new THREE.Clock();
      this.particleSystem = null;
      
      // Data refresh interval
      this.refreshInterval = 30000; // 30 seconds
      
      // Panel visibility state
      this.panelsVisible = false;
      
      this.init();
  }

  async init() {
    try {
      await this.setupScene();
      await this.loadData();
      this.setupEventListeners();
      this.showPanels();
      this.animate();
      this.hideLoadingSpinner();
      this.isInitialized = true;
      
      // Start data refresh loop
      setInterval(() => {
        this.loadData();
      }, this.refreshInterval);
      
    } catch (error) {
      console.error('Failed to initialize 3D scoreboard:', error);
    }
  }

  async setupScene() {
  const container = document.getElementById('scoreboard-3d-container');
  const canvas = document.getElementById('scoreboard-3d-canvas');
  
  if (!container || !canvas) {
      throw new Error('3D container or canvas not found');
  }

  // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);

  // Camera setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 20, 30);

  // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    antialias: true,
    alpha: true
  });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Lighting setup
    this.setupLighting();

    // Controls setup (using OrbitControls)
    this.setupControls();

    // Particle system for ambient effects
    this.setupParticleSystem();

  // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
}

  setupLighting() {
  // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    // Main directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    this.scene.add(directionalLight);

    // Point lights for dynamic effects
    const pointLight1 = new THREE.PointLight(0x007AFF, 0.8, 30);
    pointLight1.position.set(-15, 10, -15);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xFF3B30, 0.8, 30);
    pointLight2.position.set(15, 10, -15);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x34C759, 0.8, 30);
    pointLight3.position.set(0, 10, 15);
    this.scene.add(pointLight3);
  }

  setupControls() {
    // Simple mouse controls for camera
  let isMouseDown = false;
  let mouseX = 0, mouseY = 0;
  let targetRotationX = 0, targetRotationY = 0;
  let rotationX = 0, rotationY = 0;

    const canvas = this.renderer.domElement;
  
  canvas.addEventListener('mousedown', (event) => {
    isMouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  canvas.addEventListener('mousemove', (event) => {
    if (!isMouseDown) return;

    const deltaX = event.clientX - mouseX;
    const deltaY = event.clientY - mouseY;

    targetRotationY += deltaX * 0.01;
    targetRotationX += deltaY * 0.01;

    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  canvas.addEventListener('mouseup', () => {
    isMouseDown = false;
  });

  canvas.addEventListener('wheel', (event) => {
      const zoomSpeed = 0.1;
      const zoom = event.deltaY * zoomSpeed;
      this.camera.position.z += zoom;
      this.camera.position.z = Math.max(10, Math.min(100, this.camera.position.z));
    });

    // Store controls for auto-rotation
    this.controls = {
      targetRotationX,
      targetRotationY,
      rotationX,
      rotationY,
      update: () => {
        if (this.autoRotate) {
          targetRotationY += 0.005;
        }
        
    rotationX += (targetRotationX - rotationX) * 0.1;
    rotationY += (targetRotationY - rotationY) * 0.1;

        this.camera.position.x = Math.cos(rotationY) * Math.cos(rotationX) * 30;
        this.camera.position.y = Math.sin(rotationX) * 30 + 20;
        this.camera.position.z = Math.sin(rotationY) * Math.cos(rotationX) * 30;
        
        this.camera.lookAt(0, 0, 0);
      }
    };
  }

  setupParticleSystem() {
    const particleCount = 1000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Random positions in a sphere
      const radius = Math.random() * 100 + 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.cos(phi);
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Random colors
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.1 + 0.6, 0.7, 0.5);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });

    this.particleSystem = new THREE.Points(particles, particleMaterial);
    this.scene.add(this.particleSystem);
  }

  async loadData() {
    try {
    // Load challenges
    const challengesResponse = await CTFd.fetch('/api/v1/challenges');
    if (challengesResponse.ok) {
      const challengesData = await challengesResponse.json();
      if (challengesData.success) {
          this.challenges = challengesData.data;
          this.createChallengeNodes();
          this.updateChallengeLabels();
        }
      }

      // Load scoreboard
    const scoreboardResponse = await CTFd.fetch('/api/v1/scoreboard');
    if (scoreboardResponse.ok) {
      const scoreboardData = await scoreboardResponse.json();
      if (scoreboardData.success) {
          this.teams = scoreboardData.data;
          this.createTeamNodes();
          
          // Initialize previous solves tracking on first load
          if (!this.previousSolves) {
            await this.checkForNewSolves(scoreboardData.data);
          }
        }
      }

  } catch (error) {
    console.error('Error loading data:', error);
    }
  }

  async checkForNewSolves(newTeams) {
    // 不再使用独立的解题检测逻辑，改为监听ActivityPanel的数据变化
    if (!this.previousSolves) {
      this.previousSolves = new Set();
      await this.initializePreviousSolves();
      return;
    }
  }

  async initializePreviousSolves() {
    try {
      // 初始化时获取现有的解题记录，避免重复触发特效
      const response = await CTFd.fetch('/api/v1/submissions?type=correct');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          data.data.forEach(solve => {
            const solveId = `${solve.account_id}-${solve.challenge_id}-${solve.date}`;
            this.previousSolves.add(solveId);
          });
        }
      }
    } catch (error) {
      console.error('Error initializing previous solves:', error);
    }
  }

  // 外部调用接口：检测新的解题记录并触发特效
  checkAndTriggerNewSolve(submission) {
    if (!submission || submission.type !== 'correct') {
      return;
    }
    
    const solveId = `${submission.account_id}-${submission.challenge_id}-${submission.date}`;
    
    // 检查是否是新的解题记录
    if (!this.previousSolves.has(solveId)) {
      this.previousSolves.add(solveId);
      this.triggerSolveEffectFromSubmission(submission);
    }
  }

  async triggerSolveEffectFromSubmission(solve) {
    try {
      // 直接使用submission中的team和challenge信息
      let team, challenge;
      
      if (solve.team && solve.team.name) {
        // 使用submission中自带的team信息
        team = {
          account_id: solve.team_id || solve.user_id,
          name: solve.team.name,
          ...solve.team
        };
      } else {
        // 备用：从scoreboard数据中查找
        team = this.teams.find(t => t.account_id == (solve.team_id || solve.user_id));
        if (!team) {
          return;
        }
      }

      if (solve.challenge && solve.challenge.name) {
        // 使用submission中自带的challenge信息
        challenge = {
          id: solve.challenge_id,
          name: solve.challenge.name,
          value: solve.challenge.value,
          ...solve.challenge
        };
      } else {
        // 备用：从challenges数据中查找
        challenge = this.challenges.find(c => c.id == solve.challenge_id);
        if (!challenge) {
          return;
        }
      }

      // Show team movement animation
      this.showTeamMovement(team, challenge);
      
      // Trigger solve effect after movement
      setTimeout(() => {
        this.showSolveEffect(team, challenge);
      }, 2000);
      
    } catch (error) {
      console.error('Error triggering solve effect:', error);
    }
  }

  createChallengeNodes() {
    // Clear existing challenge nodes
    this.challengeNodes.forEach(node => {
      this.scene.remove(node);
    });
    this.challengeNodes.clear();

    const categories = {};
    this.challenges.forEach(challenge => {
      if (challenge && challenge.category) {
        if (!categories[challenge.category]) {
          categories[challenge.category] = [];
        }
        categories[challenge.category].push(challenge);
      }
    });

    const categoryColors = {
      'web': 0x007AFF,
      'crypto': 0x5856D6,
      'pwn': 0xFF3B30,
      'reverse': 0x34C759,
      'forensics': 0xFF9500,
      'misc': 0x8E8E93
    };

    let categoryIndex = 0;
    Object.keys(categories).forEach(category => {
      const challenges = categories[category];
      const color = categoryColors[category.toLowerCase()] || 0x007AFF;
      
  challenges.forEach((challenge, index) => {
        const node = this.createChallengeNode(challenge, color, categoryIndex, index, challenges.length);
        if (node && challenge.id) {
          this.scene.add(node);
          this.challengeNodes.set(challenge.id, node);
        }
      });
      
      categoryIndex++;
    });
  }

    createChallengeNode(challenge, color, categoryIndex, challengeIndex, categoryLength) {
    // Add null check for challenge
    if (!challenge || !challenge.id) {
      console.warn('Invalid challenge data for node creation:', challenge);
      return null;
    }

    const group = new THREE.Group();
    
    // Create different shapes based on category
    let geometry;
    const category = challenge.category ? challenge.category.toLowerCase() : 'default';
    switch (category) {
      case 'web':
        geometry = new THREE.BoxGeometry(2, 2, 2);
        break;
      case 'crypto':
        geometry = new THREE.ConeGeometry(1.5, 3, 8);
        break;
      case 'pwn':
        geometry = new THREE.SphereGeometry(1.5, 16, 16);
        break;
      case 'reverse':
        geometry = new THREE.CylinderGeometry(1, 1, 3, 8);
        break;
      case 'forensics':
        geometry = new THREE.OctahedronGeometry(1.5);
        break;
      default:
        geometry = new THREE.TetrahedronGeometry(1.5);
    }

    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      shininess: 100
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { challenge, type: 'challenge' };
    
    group.add(mesh);

    // Add glow effect
    const glowGeometry = geometry.clone();
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.2
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.scale.multiplyScalar(1.2);
    group.add(glowMesh);

    // Add text labels for challenge info
    this.addChallengeLabels(group, challenge, color);

    // Position nodes in a circular pattern
    const radius = 15 + categoryIndex * 5;
    const angle = (challengeIndex / categoryLength) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = Math.sin(challengeIndex * 0.5) * 2;

    group.position.set(x, y, z);
    group.userData = { challenge, type: 'challenge' };

    return group;
  }

  addChallengeLabels(group, challenge, color) {
    // Create canvas for text rendering
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Challenge name
    context.fillStyle = 'white';
    context.font = 'bold 16px Arial';
    context.textAlign = 'center';
    context.fillText(challenge.name, canvas.width / 2, 25);
    
    // Points
    context.fillStyle = '#FFD700';
    context.font = '14px Arial';
    context.fillText(`${challenge.value} pts`, canvas.width / 2, 45);
    
    // Solves count
    context.fillStyle = '#00FF00';
    context.font = '12px Arial';
    context.fillText(`${challenge.solves || 0} solves`, canvas.width / 2, 65);
    
    // Category
    context.fillStyle = '#87CEEB';
    context.font = '10px Arial';
    context.fillText(challenge.category.toUpperCase(), canvas.width / 2, 85);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      alphaTest: 0.1
    });
    
    // Create sprite
    const labelSprite = new THREE.Sprite(labelMaterial);
    labelSprite.scale.set(6, 3, 1);
    labelSprite.position.y = 3;
    
    group.add(labelSprite);
    
    // Store reference for updates
    group.userData.labelSprite = labelSprite;
    group.userData.labelCanvas = canvas;
    group.userData.labelContext = context;
  }

  updateChallengeLabels() {
    this.challengeNodes.forEach((node, challengeId) => {
      const challenge = node.userData.challenge;
      if (node.userData.labelSprite) {
        // Update the canvas with new solve count
        const context = node.userData.labelContext;
        const canvas = node.userData.labelCanvas;
        
        // Clear and redraw
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Challenge name
        context.fillStyle = 'white';
        context.font = 'bold 16px Arial';
        context.textAlign = 'center';
        context.fillText(challenge.name, canvas.width / 2, 25);
        
        // Points
        context.fillStyle = '#FFD700';
        context.font = '14px Arial';
        context.fillText(`${challenge.value} pts`, canvas.width / 2, 45);
        
        // Solves count
        context.fillStyle = '#00FF00';
        context.font = '12px Arial';
        context.fillText(`${challenge.solves || 0} solves`, canvas.width / 2, 65);
        
        // Category
        context.fillStyle = '#87CEEB';
        context.font = '10px Arial';
        context.fillText(challenge.category.toUpperCase(), canvas.width / 2, 85);
        
        // Update texture
        node.userData.labelSprite.material.map.needsUpdate = true;
      }
    });
  }

  createTeamNodes() {
    // Clear existing team nodes
    this.teamNodes.forEach(node => {
      this.scene.remove(node);
    });
    this.teamNodes.clear();

    this.teams.slice(0, 10).forEach((team, index) => {
      const node = this.createTeamNode(team, index);
      if (node && team.account_id) {
        this.scene.add(node);
        this.teamNodes.set(team.account_id, node);
      }
    });
  }

  createTeamNode(team, index) {
    // Add null check for team
    if (!team) {
      console.warn('Invalid team data for node creation:', team);
      return null;
    }

    const group = new THREE.Group();
    
    // Create team avatar (sphere with team color)
    const geometry = new THREE.SphereGeometry(0.8, 16, 16);
    const hue = (index * 0.1) % 1;
    const color = new THREE.Color().setHSL(hue, 0.7, 0.6);
    
    const material = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 100
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { team, type: 'team' };
    
    group.add(mesh);

    // Add team name label with null check
    if (team.name) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      context.fillStyle = 'white';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.fillText(team.name, canvas.width / 2, canvas.height / 2 + 8);
      
      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ map: texture });
      const labelSprite = new THREE.Sprite(labelMaterial);
      labelSprite.scale.set(4, 1, 1);
      labelSprite.position.y = 2;
      
      group.add(labelSprite);
    }

    // Position teams in center area
    const angle = (index / Math.min(this.teams.length, 10)) * Math.PI * 2;
    const radius = 8;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 0;

    group.position.set(x, y, z);
    group.userData = { team, type: 'team' };

    return group;
  }

  setupEventListeners() {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('click', (event) => {
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / canvas.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / canvas.clientHeight) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);

      const intersects = raycaster.intersectObjects(this.scene.children, true);
      
      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData && object.userData.type === 'challenge') {
          this.showChallengeInfo(object.userData.challenge);
        }
      }
    });

    // Setup Alpine.js event listeners
    window.addEventListener('reset-camera', () => {
      this.resetCamera();
    });

    window.addEventListener('toggle-auto-rotate', () => {
      this.toggleAutoRotate();
    });
  }

  showChallengeInfo(challenge) {
    const panel = document.getElementById('challenge-info-panel');
    if (!panel) return;

    // Add null check for challenge
    if (!challenge) {
      console.warn('Invalid challenge data for info display:', challenge);
      return;
    }

    // Safely update challenge info elements
    const nameElement = document.getElementById('challenge-name');
    const categoryElement = document.getElementById('challenge-category');
    const pointsElement = document.getElementById('challenge-points');
    const solvesElement = document.getElementById('challenge-solves');
    const difficultyElement = document.getElementById('challenge-difficulty');
    const descriptionElement = document.getElementById('challenge-description');

    if (nameElement) nameElement.textContent = challenge.name || 'Unknown Challenge';
    if (categoryElement) categoryElement.textContent = challenge.category || 'Unknown Category';
    if (pointsElement) pointsElement.textContent = challenge.value || 0;
    if (solvesElement) solvesElement.textContent = challenge.solves || 0;
    if (difficultyElement) difficultyElement.textContent = this.getDifficultyText(challenge.value || 0);
    if (descriptionElement) descriptionElement.textContent = challenge.description || 'No description available';

    panel.style.display = 'block';
    panel.classList.add('slide-in-right');

    // Auto-hide after 5 seconds
    setTimeout(() => {
      panel.style.display = 'none';
      panel.classList.remove('slide-in-right');
    }, 5000);
  }

  getDifficultyText(points) {
    if (points <= 100) return 'Easy';
    if (points <= 300) return 'Medium';
    if (points <= 500) return 'Hard';
    return 'Expert';
  }

  showTeamMovement(team, challenge) {
    const notification = document.getElementById('team-movement-notification');
    if (!notification) return;

    // Add null checks for team and challenge
    if (!team || !team.name || !challenge || !challenge.name) {
      console.warn('Invalid team or challenge data:', { team, challenge });
      return;
    }

    const teamNameElement = document.getElementById('team-name');
    const teamActionElement = document.getElementById('team-action');
    
    if (teamNameElement) teamNameElement.textContent = team.name;
    if (teamActionElement) teamActionElement.textContent = `正在解决: ${challenge.name}`;

    notification.style.display = 'block';
    notification.classList.add('slide-in-left');

    // Animate team movement
    this.animateTeamToChallenge(team, challenge);

    setTimeout(() => {
      notification.style.display = 'none';
      notification.classList.remove('slide-in-left');
    }, 3000);
  }

  animateTeamToChallenge(team, challenge) {
    // Add null checks for team and challenge
    if (!team || !team.account_id || !challenge || !challenge.id) {
      console.warn('Invalid team or challenge data for animation:', { team, challenge });
      return;
    }

    const teamNode = this.teamNodes.get(team.account_id);
    const challengeNode = this.challengeNodes.get(challenge.id);
    
    if (!teamNode || !challengeNode) {
      console.warn('Team or challenge node not found:', { teamNode, challengeNode });
      return;
    }

    const startPosition = teamNode.position.clone();
    const endPosition = challengeNode.position.clone();
    
    const duration = 2000; // 2 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      teamNode.position.lerpVectors(startPosition, endPosition, easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Show solve effect
        this.showSolveEffect(team, challenge);
      }
    };

    animate();
  }

  showSolveEffect(team, challenge) {
    // Create fireworks effect
    this.createFireworks(challenge);
    
    // Create 3D particle explosion
    this.createParticleExplosion(challenge);
    
    // Update challenge node appearance
    const challengeNode = this.challengeNodes.get(challenge.id);
    if (challengeNode) {
      // Add solve glow
      const solveGeometry = new THREE.SphereGeometry(3, 16, 16);
      const solveMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.3
      });
      const solveMesh = new THREE.Mesh(solveGeometry, solveMaterial);
      challengeNode.add(solveMesh);
      
      // Add pulsing effect
      const originalScale = challengeNode.scale.clone();
      const pulseAnimation = () => {
        const time = Date.now() * 0.005;
        const scale = 1 + Math.sin(time) * 0.2;
        challengeNode.scale.setScalar(scale);
      };
      
      const pulseInterval = setInterval(pulseAnimation, 16);
      
      // Remove after animation
      setTimeout(() => {
        challengeNode.remove(solveMesh);
        clearInterval(pulseInterval);
        challengeNode.scale.copy(originalScale);
      }, 3000);
      
      // Update challenge labels with new solve count
      this.updateChallengeLabels();
    }

    // Add to activity feed with null checks
    if (window.Alpine && window.Alpine.store) {
      try {
        const activityFeedElement = document.querySelector('[x-data*="ActivityFeed"]');
        if (activityFeedElement && activityFeedElement.__x) {
          const activityFeed = activityFeedElement.__x;
          if (activityFeed && activityFeed.addActivity && team && team.name && challenge && challenge.name) {
            activityFeed.addActivity({
              id: Date.now(),
              type: 'solve',
              team: team.name,
              message: `Solved ${challenge.name} (+${challenge.value || 0} points)`,
              time: new Date().toLocaleTimeString()
            });
      }
    }
  } catch (error) {
    console.error('Error updating activity feed:', error);
  }
}
  }

  createFireworks(challenge) {
    // Add null check for challenge
    if (!challenge || !challenge.id) {
      console.warn('Invalid challenge data for fireworks:', challenge);
      return;
    }

    const challengeNode = this.challengeNodes.get(challenge.id);
    if (!challengeNode) {
      console.warn('Challenge node not found for fireworks:', challenge.id);
      return;
    }

    const position = challengeNode.position;
    const fireworkCount = 20;

    for (let i = 0; i < fireworkCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework';
      particle.style.left = '50%';
      particle.style.top = '50%';
      particle.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
      
      const container = document.getElementById('fireworks-container');
      if (container) {
        container.appendChild(particle);

        // Animate particle
        const angle = (i / fireworkCount) * Math.PI * 2;
        const velocity = 100 + Math.random() * 100;
        const duration = 1000 + Math.random() * 1000;

        particle.animate([
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { 
            transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0)`, 
            opacity: 0 
          }
        ], {
          duration: duration,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => {
          particle.remove();
        };
      }
    }
  }

  createParticleExplosion(challenge) {
    const challengeNode = this.challengeNodes.get(challenge.id);
    if (!challengeNode) {
      console.warn('Challenge node not found for particle explosion:', challenge.id);
      return;
    }

    const position = challengeNode.position;
    const particleCount = 50;
    
    // Create particle geometry
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Random positions around challenge node
      positions[i3] = position.x + (Math.random() - 0.5) * 2;
      positions[i3 + 1] = position.y + (Math.random() - 0.5) * 2;
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * 2;
      
      // Random velocities
      velocities[i3] = (Math.random() - 0.5) * 0.5;
      velocities[i3 + 1] = Math.random() * 0.5 + 0.1;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
      
      // Random colors
      const color = new THREE.Color();
      color.setHSL(Math.random() * 0.1 + 0.6, 0.8, 0.6);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particleSystem);
    
    // Animate particles
    const startTime = Date.now();
    const animateParticles = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / 2000; // 2 seconds duration
      
      if (progress < 1) {
        const positions = particleGeometry.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          positions[i3] += velocities[i3];
          positions[i3 + 1] += velocities[i3 + 1];
          positions[i3 + 2] += velocities[i3 + 2];
          
          // Apply gravity
          velocities[i3 + 1] -= 0.01;
        }
        
        particleGeometry.attributes.position.needsUpdate = true;
        particleMaterial.opacity = 1 - progress;
        
        requestAnimationFrame(animateParticles);
      } else {
        this.scene.remove(particleSystem);
      }
    };
    
    animateParticles();
  }

  resetCamera() {
    this.camera.position.set(0, 20, 30);
    this.controls.targetRotationX = 0;
    this.controls.targetRotationY = 0;
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
  }
  
  showPanels() {
    // Show the left and right panels after 3D scene is ready
    setTimeout(() => {
      const leaderboardPanel = document.getElementById('leaderboard-panel');
      const activityPanel = document.getElementById('activity-panel');
      
      if (leaderboardPanel) {
        leaderboardPanel.style.display = 'block';
        leaderboardPanel.style.animation = 'slideInFromLeft 0.6s ease-out';
      }
      
      if (activityPanel) {
        activityPanel.style.display = 'block';
        activityPanel.style.animation = 'slideInFromRight 0.6s ease-out';
      }
      
      this.panelsVisible = true;
    }, 1000);
  }
  
  togglePanels() {
    const leaderboardPanel = document.getElementById('leaderboard-panel');
    const activityPanel = document.getElementById('activity-panel');
    
    if (this.panelsVisible) {
      // Hide panels
      if (leaderboardPanel) leaderboardPanel.style.display = 'none';
      if (activityPanel) activityPanel.style.display = 'none';
      this.panelsVisible = false;
    } else {
      // Show panels
      this.showPanels();
    }
  }
  
  testSolveEffect() {
    // 尝试使用ActivityPanel中的最新解题记录
    const activityPanel = document.querySelector('[x-data*="ActivityPanel"]');
    if (activityPanel && activityPanel.__x && activityPanel.__x.activities) {
      const latestSolve = activityPanel.__x.activities.find(activity => activity.type === 'correct');
      if (latestSolve && latestSolve.original_submission) {
        this.triggerSolveEffectFromSubmission(latestSolve.original_submission);
        return;
      }
    }
    
    // 备用方案：Test solve effect with first challenge and first team
    if (this.challenges.length > 0 && this.teams.length > 0) {
      const testChallenge = this.challenges[0];
      const testTeam = this.teams[0];
      
      // 模拟一个解题提交记录
      const mockSubmission = {
        account_id: testTeam.account_id,
        challenge_id: testChallenge.id,
        type: 'correct',
        date: new Date().toISOString()
      };
      
      this.triggerSolveEffectFromSubmission(mockSubmission);
    }
  }

  onWindowResize() {
    const container = document.getElementById('scoreboard-3d-container');
  if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  hideLoadingSpinner() {
    const spinner = document.getElementById('loading-spinner');
    const canvas = document.getElementById('scoreboard-3d-canvas');
    
    if (spinner) spinner.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    // Update controls
    if (this.controls) {
      this.controls.update();
    }

    // Rotate particle system
    if (this.particleSystem) {
      this.particleSystem.rotation.y += deltaTime * 0.1;
    }

    // Rotate challenge nodes
    this.challengeNodes.forEach(node => {
      node.rotation.y += deltaTime * 0.5;
    });

    // Rotate team nodes
    this.teamNodes.forEach(node => {
      node.rotation.y += deltaTime * 0.3;
    });

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    window.removeEventListener('resize', this.onWindowResize);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Start Alpine.js
    Alpine.start();
  
  // Initialize 3D scoreboard after Alpine is ready
  setTimeout(() => {
    // Initialize 3D scoreboard
    window.scoreboard3D = new Scoreboard3D();
    
    // Expose methods to Alpine components
    window.resetCamera = () => {
      if (window.scoreboard3D) {
        window.scoreboard3D.resetCamera();
      }
    };
    
    window.toggleAutoRotate = () => {
      if (window.scoreboard3D) {
        window.scoreboard3D.toggleAutoRotate();
      }
    };
    
    window.testSolveEffect = () => {
      if (window.scoreboard3D) {
        window.scoreboard3D.testSolveEffect();
      }
    };
    
    // Fullscreen toggle function
    window.toggleFullscreen = () => {
    const container = document.getElementById('scoreboard-3d-container');
      const icon = document.getElementById('fullscreen-icon');
      
      if (!document.fullscreenElement) {
        // Enter fullscreen
        container.requestFullscreen().then(() => {
          icon.className = 'fas fa-compress me-1';
          // Hide panels in fullscreen for better experience
          if (window.scoreboard3D) {
            const leaderboard = document.getElementById('leaderboard-panel');
            const activity = document.getElementById('activity-panel');
            if (leaderboard) leaderboard.style.display = 'none';
            if (activity) activity.style.display = 'none';
          }
        }).catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      } else {
        // Exit fullscreen
        document.exitFullscreen().then(() => {
          icon.className = 'fas fa-expand me-1';
          // Show panels again when exiting fullscreen
          if (window.scoreboard3D && window.scoreboard3D.panelsVisible) {
            setTimeout(() => {
              const leaderboard = document.getElementById('leaderboard-panel');
              const activity = document.getElementById('activity-panel');
              if (leaderboard) leaderboard.style.display = 'block';
              if (activity) activity.style.display = 'block';
            }, 100);
          }
        });
      }
    };
    
    // Handle fullscreen change events
    document.addEventListener('fullscreenchange', () => {
      if (window.scoreboard3D) {
        window.scoreboard3D.onWindowResize();
      }
    });
  }, 1000); // Increased delay to ensure everything is loaded
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.scoreboard3D) {
    window.scoreboard3D.destroy();
  }
});
