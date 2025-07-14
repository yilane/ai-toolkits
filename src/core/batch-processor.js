/**
 * 批量处理引擎
 * 负责管理批量任务的执行、进度跟踪和错误处理
 */
export default class BatchProcessor {
    constructor(options = {}) {
        this.options = {
            maxConcurrency: 3, // 最大并发数
            retryCount: 2, // 失败重试次数
            retryDelay: 1000, // 重试延迟 (ms)
            progressCallback: null,
            errorCallback: null,
            successCallback: null,
            ...options
        };

        this.queue = [];
        this.running = [];
        this.completed = [];
        this.failed = [];
        this.isProcessing = false;
        this.isPaused = false;
        this.totalTasks = 0;
        this.processedTasks = 0;
        this.startTime = null;
        this.endTime = null;
    }

    /**
     * 添加任务到队列
     */
    addTask(task) {
        const taskWrapper = {
            id: Date.now() + Math.random(),
            task: task,
            status: 'pending',
            progress: 0,
            error: null,
            result: null,
            startTime: null,
            endTime: null,
            retryCount: 0,
            ...task
        };

        this.queue.push(taskWrapper);
        this.totalTasks++;
        
        return taskWrapper.id;
    }

    /**
     * 添加多个任务
     */
    addTasks(tasks) {
        const taskIds = [];
        for (const task of tasks) {
            taskIds.push(this.addTask(task));
        }
        return taskIds;
    }

    /**
     * 开始处理队列
     */
    async start() {
        if (this.isProcessing) {
            throw new Error('Batch processor is already running');
        }

        this.isProcessing = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.processedTasks = 0;

        try {
            await this.processQueue();
        } catch (error) {
            this.handleError(error);
        } finally {
            this.isProcessing = false;
            this.endTime = Date.now();
            this.notifyComplete();
        }
    }

    /**
     * 暂停处理
     */
    pause() {
        this.isPaused = true;
    }

    /**
     * 恢复处理
     */
    resume() {
        if (this.isProcessing && this.isPaused) {
            this.isPaused = false;
            this.processQueue();
        }
    }

    /**
     * 停止处理
     */
    stop() {
        this.isPaused = true;
        this.isProcessing = false;
        
        // 取消正在运行的任务
        this.running.forEach(task => {
            task.status = 'cancelled';
        });
        
        // 将队列中的任务标记为取消
        this.queue.forEach(task => {
            task.status = 'cancelled';
        });
        
        this.queue = [];
        this.running = [];
    }

    /**
     * 清空队列
     */
    clear() {
        this.queue = [];
        this.running = [];
        this.completed = [];
        this.failed = [];
        this.totalTasks = 0;
        this.processedTasks = 0;
        this.isProcessing = false;
        this.isPaused = false;
    }

    /**
     * 处理队列
     */
    async processQueue() {
        while (this.queue.length > 0 && !this.isPaused) {
            // 控制并发数
            while (this.running.length < this.options.maxConcurrency && this.queue.length > 0) {
                const task = this.queue.shift();
                this.processTask(task);
            }

            // 等待一个任务完成
            if (this.running.length > 0) {
                await this.waitForAnyTask();
            }
        }

        // 等待所有任务完成
        while (this.running.length > 0) {
            await this.waitForAnyTask();
        }
    }

    /**
     * 处理单个任务
     */
    async processTask(taskWrapper) {
        taskWrapper.status = 'running';
        taskWrapper.startTime = Date.now();
        this.running.push(taskWrapper);

        try {
            this.notifyProgress(taskWrapper, 0, 'Starting...');

            // 执行任务
            const result = await this.executeTask(taskWrapper);
            
            taskWrapper.result = result;
            taskWrapper.status = 'completed';
            taskWrapper.progress = 100;
            taskWrapper.endTime = Date.now();
            
            this.completed.push(taskWrapper);
            this.notifyProgress(taskWrapper, 100, 'Completed');
            
        } catch (error) {
            taskWrapper.error = error;
            taskWrapper.status = 'failed';
            taskWrapper.endTime = Date.now();
            
            // 重试逻辑
            if (taskWrapper.retryCount < this.options.retryCount) {
                taskWrapper.retryCount++;
                taskWrapper.status = 'retrying';
                
                setTimeout(() => {
                    this.queue.unshift(taskWrapper);
                }, this.options.retryDelay);
                
                this.notifyProgress(taskWrapper, taskWrapper.progress, 
                    `Retrying... (${taskWrapper.retryCount}/${this.options.retryCount})`);
            } else {
                this.failed.push(taskWrapper);
                this.notifyError(taskWrapper, error);
            }
        } finally {
            // 从运行列表中移除
            const index = this.running.indexOf(taskWrapper);
            if (index !== -1) {
                this.running.splice(index, 1);
            }
            
            this.processedTasks++;
        }
    }

    /**
     * 执行任务
     */
    async executeTask(taskWrapper) {
        const { processor, data, options } = taskWrapper;
        
        if (typeof processor === 'function') {
            return await processor(data, options, (progress, message) => {
                this.notifyProgress(taskWrapper, progress, message);
            });
        } else if (processor && typeof processor.execute === 'function') {
            return await processor.execute(data, options);
        } else {
            throw new Error('Invalid processor: must be a function or object with execute method');
        }
    }

    /**
     * 等待任何一个任务完成
     */
    async waitForAnyTask() {
        return new Promise((resolve) => {
            const checkTasks = () => {
                if (this.running.length === 0) {
                    resolve();
                    return;
                }
                
                setTimeout(checkTasks, 100);
            };
            
            checkTasks();
        });
    }

    /**
     * 通知进度更新
     */
    notifyProgress(taskWrapper, progress, message) {
        taskWrapper.progress = progress;
        
        const overallProgress = this.getOverallProgress();
        const progressInfo = {
            task: taskWrapper,
            taskProgress: progress,
            taskMessage: message,
            overallProgress: overallProgress,
            processedTasks: this.processedTasks,
            totalTasks: this.totalTasks,
            remainingTasks: this.totalTasks - this.processedTasks,
            runningTasks: this.running.length,
            completedTasks: this.completed.length,
            failedTasks: this.failed.length
        };

        if (this.options.progressCallback) {
            this.options.progressCallback(progressInfo);
        }

        // 发送全局事件
        this.dispatchEvent('batch-progress', progressInfo);
    }

    /**
     * 通知错误
     */
    notifyError(taskWrapper, error) {
        const errorInfo = {
            task: taskWrapper,
            error: error,
            message: error.message,
            stack: error.stack
        };

        if (this.options.errorCallback) {
            this.options.errorCallback(errorInfo);
        }

        this.dispatchEvent('batch-error', errorInfo);
    }

    /**
     * 通知完成
     */
    notifyComplete() {
        const duration = this.endTime - this.startTime;
        const completeInfo = {
            totalTasks: this.totalTasks,
            completedTasks: this.completed.length,
            failedTasks: this.failed.length,
            duration: duration,
            averageTime: duration / this.totalTasks,
            successRate: (this.completed.length / this.totalTasks) * 100
        };

        if (this.options.successCallback) {
            this.options.successCallback(completeInfo);
        }

        this.dispatchEvent('batch-complete', completeInfo);
    }

    /**
     * 获取整体进度
     */
    getOverallProgress() {
        if (this.totalTasks === 0) return 0;
        
        let totalProgress = 0;
        
        // 已完成的任务
        totalProgress += this.completed.length * 100;
        
        // 正在运行的任务
        for (const task of this.running) {
            totalProgress += task.progress;
        }
        
        return Math.round(totalProgress / this.totalTasks);
    }

    /**
     * 获取处理统计信息
     */
    getStats() {
        const now = Date.now();
        const elapsed = this.startTime ? now - this.startTime : 0;
        
        return {
            totalTasks: this.totalTasks,
            processedTasks: this.processedTasks,
            pendingTasks: this.queue.length,
            runningTasks: this.running.length,
            completedTasks: this.completed.length,
            failedTasks: this.failed.length,
            overallProgress: this.getOverallProgress(),
            elapsed: elapsed,
            isProcessing: this.isProcessing,
            isPaused: this.isPaused,
            successRate: this.totalTasks > 0 ? (this.completed.length / this.totalTasks) * 100 : 0
        };
    }

    /**
     * 获取失败的任务
     */
    getFailedTasks() {
        return this.failed;
    }

    /**
     * 获取完成的任务
     */
    getCompletedTasks() {
        return this.completed;
    }

    /**
     * 获取所有任务
     */
    getAllTasks() {
        return [
            ...this.queue,
            ...this.running,
            ...this.completed,
            ...this.failed
        ];
    }

    /**
     * 重试失败的任务
     */
    retryFailedTasks() {
        const failedTasks = this.failed.splice(0);
        
        for (const task of failedTasks) {
            task.status = 'pending';
            task.error = null;
            task.retryCount = 0;
            task.progress = 0;
            this.queue.push(task);
        }
        
        return failedTasks.length;
    }

    /**
     * 移除任务
     */
    removeTask(taskId) {
        // 从队列中移除
        let index = this.queue.findIndex(task => task.id === taskId);
        if (index !== -1) {
            this.queue.splice(index, 1);
            this.totalTasks--;
            return true;
        }
        
        // 从运行列表中移除（标记为取消）
        index = this.running.findIndex(task => task.id === taskId);
        if (index !== -1) {
            this.running[index].status = 'cancelled';
            return true;
        }
        
        return false;
    }

    /**
     * 设置选项
     */
    setOptions(options) {
        this.options = { ...this.options, ...options };
    }

    /**
     * 发送事件
     */
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    /**
     * 导出结果
     */
    exportResults() {
        return {
            stats: this.getStats(),
            completed: this.completed.map(task => ({
                id: task.id,
                data: task.data,
                result: task.result,
                duration: task.endTime - task.startTime
            })),
            failed: this.failed.map(task => ({
                id: task.id,
                data: task.data,
                error: task.error?.message,
                retryCount: task.retryCount
            }))
        };
    }

    /**
     * 创建任务
     */
    static createTask(processor, data, options = {}) {
        return {
            processor,
            data,
            options,
            name: options.name || 'Untitled Task',
            description: options.description || ''
        };
    }

    /**
     * 创建图像处理任务
     */
    static createImageTask(tool, file, options = {}) {
        return this.createTask(
            async (data, opts, progressCallback) => {
                // 设置进度回调
                if (progressCallback && tool.showProgress) {
                    const originalShowProgress = tool.showProgress.bind(tool);
                    tool.showProgress = (progress, message) => {
                        progressCallback(progress, message);
                        originalShowProgress(progress, message);
                    };
                }
                
                return await tool.execute(data, opts);
            },
            file,
            {
                ...options,
                name: `Process ${file.name}`,
                description: `Processing ${file.name} with ${tool.name}`
            }
        );
    }
}

/**
 * 批量处理队列管理器
 * 单例模式，用于全局任务管理
 */
export class BatchProcessorManager {
    constructor() {
        if (BatchProcessorManager.instance) {
            return BatchProcessorManager.instance;
        }
        
        this.processors = new Map();
        this.defaultProcessor = null;
        
        BatchProcessorManager.instance = this;
    }

    /**
     * 创建处理器
     */
    createProcessor(id, options = {}) {
        const processor = new BatchProcessor(options);
        this.processors.set(id, processor);
        
        if (!this.defaultProcessor) {
            this.defaultProcessor = processor;
        }
        
        return processor;
    }

    /**
     * 获取处理器
     */
    getProcessor(id) {
        return this.processors.get(id) || this.defaultProcessor;
    }

    /**
     * 移除处理器
     */
    removeProcessor(id) {
        const processor = this.processors.get(id);
        if (processor) {
            processor.stop();
            this.processors.delete(id);
        }
    }

    /**
     * 获取默认处理器
     */
    getDefaultProcessor() {
        if (!this.defaultProcessor) {
            this.defaultProcessor = this.createProcessor('default');
        }
        return this.defaultProcessor;
    }

    /**
     * 清理所有处理器
     */
    cleanup() {
        this.processors.forEach(processor => {
            processor.stop();
        });
        this.processors.clear();
        this.defaultProcessor = null;
    }
}

// 全局实例
export const batchProcessorManager = new BatchProcessorManager();