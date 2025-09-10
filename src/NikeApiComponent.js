import React, { useState } from 'react';
import axios from 'axios';

const NikeApiComponent = () => {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const nikeApiUrl = 'https://api.nike.com.cn/deliver/available_gtins/v3?filter=gtin(00194500874985)&filter=merchGroup(CN)';

  const fetchNikeData = async () => {
    setLoading(true);
    setError(null);
    setApiData(null);

    try {
      const response = await axios.get(nikeApiUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // 解析JSON响应为对象
      const parsedData = response.data;
      setApiData(parsedData);
      
    } catch (err) {
      console.error('Nike API请求失败:', err);
      setError(`请求失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nike-api-container">
      <h3 className="nike-api-title">🏃‍♂️ Nike API 数据获取</h3>
      
      <div className="nike-api-controls">
        <button 
          onClick={fetchNikeData} 
          disabled={loading}
          className="nike-api-button"
        >
          {loading ? '请求中...' : '获取Nike产品数据'}
        </button>
      </div>

      {error && (
        <div className="nike-api-error">
          <h4>❌ 错误信息:</h4>
          <p>{error}</p>
          <small>注意：由于CORS政策，可能无法直接从浏览器访问外部API</small>
        </div>
      )}

      {apiData && (
        <div className="nike-api-result">
          <h4>✅ API响应数据:</h4>
          <div className="nike-api-json">
            <pre>{JSON.stringify(apiData, null, 2)}</pre>
          </div>
          
          {/* 解析并显示关键信息 */}
          <div className="nike-api-parsed">
            <h5>📊 解析的数据对象:</h5>
            <ul>
              <li><strong>数据类型:</strong> {typeof apiData}</li>
              <li><strong>对象键数量:</strong> {Object.keys(apiData).length}</li>
              {apiData.gtin && <li><strong>GTIN:</strong> {apiData.gtin}</li>}
              {apiData.merchGroup && <li><strong>商品组:</strong> {apiData.merchGroup}</li>}
              {apiData.available !== undefined && <li><strong>可用状态:</strong> {apiData.available ? '是' : '否'}</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="nike-api-info">
        <h5>🔗 API端点:</h5>
        <code>{nikeApiUrl}</code>
      </div>
    </div>
  );
};

export default NikeApiComponent;