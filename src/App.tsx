import React, { useState, useEffect } from 'react';
import './App.css';
// import UrlToggleButton from './UrlToggleButton';

interface Scheduler {
  id: number;
  time: string;
  status: string;
  statusLead: string;
  leadId: string;
}

interface Day {
  id: number;
  date: string;
  dayOfWeek: string;
  schedulers: Scheduler[];
}

interface CustomError extends Error {
  cause?: {
    code: number;
  };
}

function App() {
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [date, setDate] = useState(localStorage.getItem('date') || '');
  const [leadId, setLeadId] = useState('');
  const [status, setStatus] = useState('');
  const [statusLead, setStatusLead] = useState('');
  const [data, setData] = useState<Day[] | null>(null);
  const [result, setResult] = useState<Scheduler | null>(null);
  const [blockStatus, setBlockStatus] = useState({
    leadIdBlock: '',
    statusBlock: '',
    statusLeadBlock: '',
  });
  const [selectedLead, setSelectedLead] = useState<Scheduler | null>(null);
  const [formattedDateToFilter, setFormattedDateToFilter] = useState('');
  const [timer, setTimer] = useState(5);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [isKids, setIsKids] = useState(false);
  const [isManagerSearch, setIsManagerSearch] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    if (!date) {
      setDate(today);
    }

    localStorage.setItem('username', username);
    localStorage.setItem('date', date);
  }, [username, date]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isFetching) {
      interval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer === 1) {
            fetchData(username, date);
            return 5;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isFetching, username, date, isKids, isManagerSearch]);

  function formatDateToFetch(date: string): string {
    const [year, month, day] = date.split('-');
    return `${month}-${day}-${year}`;
  }

  function formatDateToFilter(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}-${month}-${year}`;
  }

  async function fetchData(username: string, date: string) {
    try {
      const formattedDate = formatDateToFetch(date);
      const formattedDateToFilter = formatDateToFilter(date);
      setFormattedDateToFilter(formattedDateToFilter);

      let url = '';
      if (isManagerSearch) {
        url = isKids
          ? `https://urban-kids-manager.ru/api/Admin/getSchedulerV2?username=%40markelova_pro_sales&date=${formattedDate}&pageNumber=1&pageSize=100`
          : `https://urban-bot2.zudov.pro/api/Admin/getSchedulerV2?username=%40serkornilov&date=${formattedDate}&pageNumber=1&pageSize=1000`;
      } else {
        url = isKids
          ? `https://urban-kids-manager.ru/api/Expert/getSchedulerV2?username=${username}&dateStart=${formattedDate}`
          : `https://urban-bot2.zudov.pro/api/expert/getScheduler?username=${username}&dateStart=${formattedDate}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        setData(null);
        setError(`Проблемы с получением данных под именем: ${username}, число: ${date}. Status: ${response.status} ${response.statusText}`);
        throw new Error(
          `Проблемы с получением данных под именем: ${username}, число: ${date}. Status: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      setData(data);
      return data;
    } catch (error: unknown) {
      console.error('Проблемы с подключением:', error);
      if (error instanceof Error) {
        const customError = error as CustomError;
        if (customError.cause && customError.cause.code) {
          console.error('Код ошибки:', customError.cause.code);
        }
      }
      return null;
    }
  }

  const handlePostRequest = (id: number, status: number) => {
    const isConfirmed = window.confirm('Вы уверены, что хотите подтвердить этот лид?');
    if (isConfirmed) {
      try {
        let url = isKids
          ? `https://urban-kids-manager.ru/api/Expert/setStatusScheduler`
          : `https://urban-bot2.zudov.pro/api/expert/setStatusScheduler`;

        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: id, status: status }),
        })
        .then((response) => response.text())
        .then((text) => {
          window.confirm('Ответ от запроса: ' + text);
          fetchData(username, date);
        })
        .catch((error) => {
          console.error('Error:', error);
        });
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };  

  const renderLeads = (leads: Scheduler[]) => {
    if (!leads || leads.length === 0) {
      return <p>No leads found</p>;
    }

    return leads.map((lead) => (
      <div
        key={lead.id}
        className={`lead-block ${selectedLead?.id === lead.id ? 'selected' : ''}`}
        onClick={() => setSelectedLead(lead)}
      >
        <div>ID: {lead.id}</div>
        <div>Time: {lead.time}</div>
        <div className={`status ${lead.status === 'Подтвердил' && !lead.statusLead ? 'bug' : 'ok'}`}>
          Статус: {lead.status}
        </div>
        <div className={`status-lead ${lead.status === 'Свободен' && lead.statusLead ? 'bug' : 'ok'}`}>
          Status Lead: {lead.statusLead}
        </div>
        <div className={`lead-id ${lead.status === 'Назначен урок' && !lead.leadId ? 'bug' : 'ok'}`}>
          Lead ID: <a href={`https://b24-a8ju75.bitrix24.ru/crm/lead/details/${lead.leadId}/`}>{lead.leadId}</a>
        </div>
        {selectedLead?.id === lead.id && (
          <div className="buttons">
            <button className="button free" onClick={() => handlePostRequest(lead.id, 0)}>Освободить</button>
            <button className="button confirm" onClick={() => handlePostRequest(lead.id, 4)}>Подтвердить</button>
            <button className="button reject" onClick={() => handlePostRequest(lead.id, 3)}>Отклонить</button>
            <button className="button busy" onClick={() => handlePostRequest(lead.id, 1)}>Занят</button>
          </div>
        )}
      </div>
    ));
  };

  const filterLeadsByCurrentDate = (data: Day[] | { paginatedUsers: { items: { schedulers: Scheduler[] }[] } }) => {
    if (Array.isArray(data)) {
      return data.find((day) => day.date === formattedDateToFilter)?.schedulers || [];
    } else {
      return data.paginatedUsers.items.flatMap((item) => item.schedulers);
    }
  };

  const extractIdFromUrl = (url: string): string | null => {
    const urlParts = url.split('/');
    const idIndex = urlParts.indexOf('details') + 1;

    if (idIndex > 0 && idIndex < urlParts.length) {
      return urlParts[idIndex];
    }

    return url;
  };

  const filterLeads = (leads: Scheduler[]) => {
    return leads.filter((lead) => {
      return (
        (!leadId || (lead.leadId && lead.leadId.includes(leadId))) &&
        (!status || (lead.status && lead.status.includes(status))) &&
        (!statusLead || (lead.statusLead && lead.statusLead.includes(statusLead)))
      );
    });
  };

  const handleFetchData = () => {
    fetchData(username, date);
    setIsFetching(true);
  };

  const handleLeadIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const extractedId = extractIdFromUrl(value);
    setLeadId(extractedId || value);
  };

  return (
    <div className="App">
      <div className="input-block">
        <label>
          <p>Телеграм эксперта</p>
          <input
            type="text"
            placeholder="Телеграм"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          <p>Дата</p>
          <input
            type="date"
            data-date=""
            data-date-format="MMMM DD YYYY"
            value={date}
            onChange={(e) => setDate(e.target.value.split('').join(''))}
          />
        </label>
      </div>
      <label>
        <button onClick={handleFetchData}>Получить данные</button>
        {isFetching && <p>Обновление через: {timer}</p>}
      </label>

      <label>
        <input type="checkbox" checked={isKids} onChange={() => setIsKids(!isKids)} />
        Urman Kids
      </label>
      <label>
        <input type="checkbox" checked={isManagerSearch} onChange={() => setIsManagerSearch(!isManagerSearch)} />
        Все лиды(от имени руководителя)
      </label>
      <h6>Данные обновляются в реальном времени по таймеру, также для обновления данных нажми кнопку получить данные или кнопку действия, будь-то освободить, подтвердить и тд</h6>
      <h6>Нужно ввести тг эксперта, а затем нажать на нужный лид. лиды с багами подсвечиваются красным, после нажатия отправляется пост запрос на изменение. По идее, если не получается подтвердить или отказаться, то выйдет сообщение</h6>
      <div className="function-block">
        <div className="function-item" style={{ backgroundColor: blockStatus.leadIdBlock }}>
          <input
            type="text"
            placeholder="Lead ID"
            value={leadId}
            onChange={handleLeadIdChange}
          />
        </div>
        <div className="function-item" style={{ backgroundColor: blockStatus.statusBlock }}>
          <input
            type="text"
            placeholder="Статус"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
        <div className="function-item" style={{ backgroundColor: blockStatus.statusLeadBlock }}>
          <input
            type="text"
            placeholder="Подстатус"
            value={statusLead}
            onChange={(e) => setStatusLead(e.target.value)}
          />
        </div>
      </div>
      <div className="result-block">
        {result ? (
          <div>
            <h3>Найденный лид</h3>
            {renderLeads([result])}
          </div>
        ) : (
          <div>
            <h3>Все лиды</h3>
            <h4>{formattedDateToFilter}</h4>
            {data ? (
              <div className="leads">
                {renderLeads(filterLeads(filterLeadsByCurrentDate(data)))}
              </div>
            ) : error ? (
              <p>{error}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
