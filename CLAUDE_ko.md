# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 코드베이스에서 작업할 때 지침을 제공합니다.

## 개발 명령어

```bash
# 종속성 설치
npm install

# 개발 서버 시작 (http://localhost:3000에서 실행)
npm start

# 워치 모드로 테스트 실행
npm test

# 프로덕션 빌드 생성
npm run build

# 프로덕션 빌드를 로컬에서 실행 (PORT 환경변수 필요)
PORT=3000 npm run start:prod
```

## 아키텍처 개요

이것은 마이크로서비스 기반 블로그/포럼 시스템의 React 18 클라이언트 애플리케이션입니다. 이 애플리케이션은 두 개의 독립적인 백엔드 서비스와 통신합니다:

- **Posts Service**: `http://localhost:4000` - 게시물 생성 및 검색 처리
- **Comments Service**: `http://localhost:4001` - 게시물 댓글 관리

### 환경 설정

서비스 URL은 환경변수로 설정할 수 있습니다:
- `REACT_APP_POSTS_SERVICE_URL` - Posts 서비스 URL (기본값: http://localhost:4000)
- `REACT_APP_COMMENTS_SERVICE_URL` - Comments 서비스 URL (기본값: http://localhost:4001)

프로덕션 빌드의 경우, 이들은 빌드 시점에 설정되어야 합니다:
```bash
REACT_APP_POSTS_SERVICE_URL=https://api.example.com/posts \
REACT_APP_COMMENTS_SERVICE_URL=https://api.example.com/comments \
npm run build
```

### 컴포넌트 구조

애플리케이션은 `/src`에서 간단하고 평면적인 컴포넌트 구조를 사용합니다:

- `App.js` - PostCreate와 PostList를 렌더링하는 루트 컴포넌트
- `PostCreate.js` - 새 게시물을 생성하기 위한 폼 컴포넌트
- `PostList.js` - 모든 게시물을 가져와서 표시하고, 댓글 기능을 통합
- `CommentCreate.js` - 특정 게시물에 댓글을 추가하는 폼
- `CommentList.js` - 주어진 게시물의 댓글을 표시

### 주요 패턴

1. **상태 관리**: React hooks를 사용한 로컬 상태 (useState, useEffect)
2. **API 통신**: 마이크로서비스에 대한 HTTP 요청에 Axios 사용
3. **스타일링**: Bootstrap 4.3.1 (public/index.html의 CDN을 통해 로드)
4. **라우팅 없음**: 클라이언트 사이드 라우팅이 없는 단일 페이지 애플리케이션
5. **컴포넌트 설계**: 함수형 컴포넌트만 사용, 클래스 컴포넌트 사용 안 함
6. **데이터 플로우**: props를 사용한 단방향 데이터 플로우, 전역 상태 관리 없음

### 서비스 통합

애플리케이션은 다음 엔드포인트가 사용 가능할 것으로 예상합니다:

- `GET /posts` - 모든 게시물 가져오기 ({id, title} 객체 배열 반환)
- `POST /posts` - 새 게시물 생성 (요청 본문에서 {title} 예상)
- `GET /posts/:id/comments` - 게시물의 댓글 가져오기 ({id, content} 객체 배열 반환)
- `POST /posts/:id/comments` - 게시물에 댓글 추가 (요청 본문에서 {content} 예상)

### Docker 배포

애플리케이션은 컨테이너화된 배포를 위한 Docker 설정을 포함합니다:

```bash
# Docker 이미지 빌드
docker build -t client .

# 환경변수를 사용하여 실행
docker run -p 8080:80 \
  -e REACT_APP_POSTS_SERVICE_URL=http://posts-service:4000 \
  -e REACT_APP_COMMENTS_SERVICE_URL=http://comments-service:4001 \
  client
```

Dockerfile은 멀티 스테이지 빌드와 nginx를 사용한 프로덕션 서빙을 사용합니다.

### 테스트

이것은 Jest와 React Testing Library가 사전 구성된 Create React App 프로젝트입니다. `npm test`를 사용하여 테스트를 실행합니다.

참고: 코드베이스에는 현재 커스텀 테스트가 존재하지 않습니다. 테스트 인프라는 준비되었지만 사용되지 않습니다.